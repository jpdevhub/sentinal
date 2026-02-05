-- Import script for FedEx DCA cases dataset
-- This script handles the mapping between CSV columns and database columns

-- First, let's create a temporary table to hold the CSV data
DROP TABLE IF EXISTS temp_csv_import;
CREATE TEMP TABLE temp_csv_import (
    case_id text,
    invoice_amount numeric,
    days_overdue integer,
    customer_type text,
    credit_score integer,
    past_recovery_rate numeric,
    dispute_history integer,
    dca_id text,
    dca_performance_score integer,
    sla_breach_count integer,
    recovered integer,
    customer_id text,
    customer_name text,
    case_created_date text,
    assigned_date text,
    case_status text,
    amount_recovered numeric,
    payment_date text,
    case_closed_date text,
    risk_score numeric,
    priority_level text,
    action_count integer,
    last_action_type text,
    last_action_date text,
    next_followup_date text,
    escalation_flag text,
    escalation_reason text
);

-- Copy data from CSV into temp table
\copy temp_csv_import FROM '/Volumes/T7/FedEx_iitmadras/database/cleaned_data.csv' WITH (FORMAT CSV, HEADER true);

-- Now insert into the actual cases table with proper mapping and type conversions
INSERT INTO cases (
    case_id,
    customer_id,
    customer_name,
    invoice_amount,
    amount_recovered,
    days_overdue,
    customer_type,
    credit_score,
    past_recovery_rate,
    dispute_history,
    case_status,
    risk_score,
    priority_level,
    dca_id,
    dca_performance_score,
    assigned_date,
    case_created_date,
    payment_date,
    case_closed_date,
    recovered,
    action_count,
    last_action_type,
    sla_breach_count,
    escalation_flag,
    escalation_reason,
    last_action_date,
    next_followup_date
)
SELECT 
    case_id,
    customer_id,
    customer_name,
    invoice_amount,
    COALESCE(amount_recovered, 0) as amount_recovered,
    days_overdue,
    customer_type,
    credit_score,
    past_recovery_rate,
    dispute_history,
    case_status::case_status_enum as case_status,
    risk_score,
    priority_level::priority_level_enum as priority_level,
    dca_id,
    dca_performance_score,
    TO_TIMESTAMP(assigned_date, 'YYYY-MM-DD')::timestamp without time zone as assigned_date,
    CASE 
        WHEN case_created_date IS NOT NULL AND case_created_date != '' 
        THEN TO_DATE(case_created_date, 'YYYY-MM-DD')
        ELSE NULL
    END as case_created_date,
    CASE 
        WHEN payment_date IS NOT NULL AND payment_date != '' 
        THEN TO_DATE(payment_date, 'YYYY-MM-DD')
        ELSE NULL
    END as payment_date,
    CASE 
        WHEN case_closed_date IS NOT NULL AND case_closed_date != '' 
        THEN TO_DATE(case_closed_date, 'YYYY-MM-DD')
        ELSE NULL
    END as case_closed_date,
    CASE 
        WHEN recovered::text = '1' THEN true
        WHEN recovered::text = '0' THEN false
        ELSE false
    END as recovered,
    COALESCE(action_count, 0) as action_count,
    last_action_type,
    sla_breach_count,
    CASE 
        WHEN escalation_flag::text = '1' THEN true
        WHEN escalation_flag::text = '0' THEN false
        ELSE false
    END as escalation_flag,
    NULLIF(escalation_reason, '') as escalation_reason,
    CASE 
        WHEN last_action_date IS NOT NULL AND last_action_date != '' 
        THEN TO_TIMESTAMP(last_action_date, 'YYYY-MM-DD')::timestamp without time zone
        ELSE NULL
    END as last_action_date,
    CASE 
        WHEN next_followup_date IS NOT NULL AND next_followup_date != '' 
        THEN TO_TIMESTAMP(next_followup_date, 'YYYY-MM-DD')::timestamp without time zone
        ELSE NULL
    END as next_followup_date
FROM temp_csv_import
WHERE case_id IS NOT NULL;

-- Show import results
SELECT 
    'Import completed successfully!' as message,
    COUNT(*) as total_cases_imported
FROM cases;

-- Show sample of imported data
SELECT 
    case_id,
    customer_name,
    customer_type,
    credit_score,
    invoice_amount,
    case_status,
    priority_level,
    dca_id,
    recovered,
    action_count
FROM cases 
ORDER BY case_id 
LIMIT 5;