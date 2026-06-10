-- PTP Watchdog: pg_cron based automation
-- Enable pg_cron extension (Supabase supports this natively)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant pg_cron usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create the PTP watchdog cron job: runs every night at 11:59 PM UTC
SELECT cron.schedule(
  'ptp-watchdog-nightly',   -- unique job name
  '59 23 * * *',            -- every day at 23:59 UTC
  $$
    UPDATE public.cases
    SET 
      case_status   = 'ACTIVE'::case_state,
      sla_breach_count = sla_breach_count + 1,
      ptp_date      = NULL
    WHERE 
      case_status = 'PROMISE_TO_PAY'::case_state 
      AND ptp_date IS NOT NULL
      AND ptp_date::date < CURRENT_DATE;
  $$
);
