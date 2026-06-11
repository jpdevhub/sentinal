-- PTP Watchdog: Enterprise-Grade Automation
-- 1. Enable pg_cron extension (Supabase supports this natively)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant pg_cron usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- 2. Create the robust processing function
CREATE OR REPLACE FUNCTION public.process_stale_ptps(batch_size INT DEFAULT 500)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    processed_count INT;
BEGIN
    -- We use a CTE (Common Table Expression) to select, lock, update, and audit in ONE atomic transaction.
    WITH locked_cases AS (
        -- Step A: Find and Lock (Race Condition Prevention)
        SELECT case_id 
        FROM public.cases
        WHERE case_status = 'PROMISE_TO_PAY'::case_state 
          AND ptp_date IS NOT NULL
          AND ptp_date < CURRENT_TIMESTAMP
        FOR UPDATE SKIP LOCKED -- Enterprise lock: grabs available rows, skips locked ones without waiting
        LIMIT batch_size
    ),
    updated_cases AS (
        -- Step B: Update the locked cases
        UPDATE public.cases c
        SET 
            case_status = 'ACTIVE'::case_state,
            sla_breach_count = COALESCE(c.sla_breach_count, 0) + 1,
            ptp_date = NULL,
            updated_at = NOW()
        FROM locked_cases l
        WHERE c.case_id = l.case_id
        RETURNING c.case_id
    )
    -- Step C: Write the Audit Trail
    INSERT INTO public.case_actions (case_id, action_type, note, created_at)
    SELECT 
        u.case_id, 
        'SYSTEM_PTP_BREACH', 
        'PTP deadline missed. System Watchdog auto-reverted case to ACTIVE and incremented SLA breach count.',
        NOW()
    FROM updated_cases u;
    
    -- Log to postgres console for debugging
    GET DIAGNOSTICS processed_count = ROW_COUNT;
    RAISE NOTICE 'Processed % PTP breaches in this batch.', processed_count;
END;
$$;

-- 3. Schedule the cron job
-- Safely unschedule if it exists so migrations are re-runnable
DO $$
BEGIN
    PERFORM cron.unschedule('ptp-watchdog-batch');
EXCEPTION WHEN OTHERS THEN
    -- Ignore error if job doesn't exist
END $$;

-- Schedule to run once every 24 hours (at midnight)
SELECT cron.schedule(
  'ptp-watchdog-batch',
  '0 0 * * *', 
  'SELECT public.process_stale_ptps(500);'
);
