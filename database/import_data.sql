-- Temporarily disable RLS for data import
ALTER TABLE public.cases DISABLE ROW LEVEL SECURITY;

-- Copy the cleaned CSV data
\copy cases(case_id, invoice_amount, days_overdue, customer_type, credit_score, past_recovery_rate, dispute_history, dca_id, dca_performance_score, sla_breach_count, recovered, customer_id, customer_name, case_created_date, assigned_date, case_status, amount_recovered, payment_date, case_closed_date, risk_score, priority_level, action_count, last_action_type, last_action_date, next_followup_date, escalation_flag, escalation_reason) FROM '/Volumes/T7/FedEx_iitmadras/cleaned_data.csv' WITH (FORMAT csv, HEADER, NULL '');

-- Re-enable RLS
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;