BEGIN;

-- 1. Create your Enums (Adding IF NOT EXISTS for safety)
DO $$ BEGIN
    CREATE TYPE case_state AS ENUM (
        'UNASSIGNED', 'ALLOCATED', 'ACTIVE', 'PROMISE_TO_PAY', 
        'VERIFICATION_PENDING', 'RECONCILED', 'LEGAL_REVIEW'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE debtor_intent AS ENUM (
        'WILLING_BUT_UNABLE', 'WILLING_AND_ABLE', 
        'DISPUTED_INVOICE', 'EVADING_CONTACT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. CRITICAL: Drop the old default first so the ALTER doesn't crash
ALTER TABLE public.cases ALTER COLUMN case_status DROP DEFAULT;

-- 3. Map the data safely (Using UPPER and TRIM to prevent string mismatch bugs)
ALTER TABLE public.cases 
  ALTER COLUMN case_status TYPE case_state 
  USING CASE 
    WHEN UPPER(TRIM(case_status::text)) = 'OPEN' THEN 'UNASSIGNED'::case_state
    WHEN UPPER(TRIM(case_status::text)) = 'IN_PROGRESS' THEN 'ACTIVE'::case_state
    WHEN UPPER(TRIM(case_status::text)) = 'PAID' THEN 'RECONCILED'::case_state
    WHEN UPPER(TRIM(case_status::text)) = 'DISPUTE' THEN 'LEGAL_REVIEW'::case_state
    ELSE 'UNASSIGNED'::case_state -- Safely catches NULLs or weird legacy strings
  END;

-- 4. Reapply the new strict ENUM default
ALTER TABLE public.cases ALTER COLUMN case_status SET DEFAULT 'UNASSIGNED'::case_state;

-- 5. Add your new columns
ALTER TABLE public.cases 
  ADD COLUMN IF NOT EXISTS current_intent debtor_intent DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ptp_date TIMESTAMP DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS version_id INT DEFAULT 1;

COMMIT;
