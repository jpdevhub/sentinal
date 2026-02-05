-- Sample data for the Final Complete Database Schema
-- This will populate the database with realistic test data

-- Sample cases data with the new schema structure
INSERT INTO public.cases (
    case_id, customer_id, customer_name, invoice_amount, amount_recovered, 
    days_overdue, case_status, risk_score, priority_level, predicted_recovery_date,
    dca_id, dca_performance_score, assigned_date, sla_breach_count, 
    escalation_flag, escalation_reason, last_action_date, next_followup_date
) VALUES 
-- Cases assigned to FEDEX_HQ (FedEx Administrator cases)
('CASE_001', 'CUST_001', 'Acme Corporation', 25000.00, 0, 45, 'OPEN', 8.5, 'HIGH', 
 current_date + interval '30 days', 'FEDEX_HQ', 95, current_timestamp - interval '5 days', 
 2, true, 'Customer unresponsive', current_timestamp - interval '2 days', current_date + interval '3 days'),

('CASE_002', 'CUST_002', 'TechStart Inc', 15000.00, 5000.00, 30, 'IN_PROGRESS', 6.2, 'MEDIUM',
 current_date + interval '20 days', 'FEDEX_HQ', 92, current_timestamp - interval '3 days',
 1, false, NULL, current_timestamp - interval '1 day', current_date + interval '5 days'),

-- Cases assigned to DCA_8f3d1 (Agency Manager organization)
('CASE_003', 'CUST_003', 'Global Shipping Ltd', 50000.00, 50000.00, 15, 'PAID', 9.1, 'HIGH',
 current_date - interval '5 days', 'DCA_8f3d1', 88, current_timestamp - interval '20 days',
 0, false, NULL, current_timestamp - interval '10 days', NULL),

('CASE_004', 'CUST_004', 'Local Store Co', 3500.00, 0, 60, 'DISPUTE', 7.3, 'MEDIUM',
 current_date + interval '45 days', 'DCA_8f3d1', 85, current_timestamp - interval '10 days',
 3, true, 'Legal action required', current_timestamp - interval '3 days', current_date + interval '7 days'),

-- Cases assigned to DCA_9a2b4 (Agency Agent organization)
('CASE_005', 'CUST_005', 'Enterprise Solutions', 75000.00, 25000.00, 90, 'IN_PROGRESS', 9.8, 'HIGH',
 current_date + interval '60 days', 'DCA_9a2b4', 90, current_timestamp - interval '15 days',
 5, true, 'Bankruptcy proceedings', current_timestamp - interval '1 day', current_date + interval '2 days'),

('CASE_006', 'CUST_006', 'Small Business LLC', 8500.00, 2000.00, 35, 'OPEN', 4.2, 'LOW',
 current_date + interval '25 days', 'DCA_9a2b4', 82, current_timestamp - interval '7 days',
 1, false, NULL, current_timestamp - interval '4 days', current_date + interval '10 days'),

-- Cases assigned to DCA_7c1d2 (Default/fallback organization)
('CASE_007', 'CUST_007', 'Retail Chain Corp', 18000.00, 0, 120, 'DISPUTE', 9.5, 'HIGH',
 current_date + interval '90 days', 'DCA_7c1d2', 87, current_timestamp - interval '25 days',
 8, true, 'Court proceedings initiated', current_timestamp - interval '2 days', current_date + interval '14 days'),

('CASE_008', 'CUST_008', 'Service Provider Inc', 4200.00, 4200.00, 10, 'PAID', 3.1, 'LOW',
 current_date - interval '2 days', 'DCA_7c1d2', 89, current_timestamp - interval '15 days',
 0, false, NULL, current_timestamp - interval '5 days', NULL),

-- Additional cases for comprehensive testing
('CASE_009', 'CUST_009', 'Manufacturing Co', 32000.00, 8000.00, 75, 'IN_PROGRESS', 7.8, 'HIGH',
 current_date + interval '40 days', 'DCA_8f3d1', 91, current_timestamp - interval '12 days',
 4, true, 'Payment plan negotiated', current_timestamp - interval '1 day', current_date + interval '7 days'),

('CASE_010', 'CUST_010', 'Consulting Firm', 12500.00, 0, 25, 'OPEN', 5.5, 'MEDIUM',
 current_date + interval '35 days', 'DCA_9a2b4', 86, current_timestamp - interval '6 days',
 0, false, NULL, current_timestamp - interval '3 days', current_date + interval '5 days');

/*
Complete Database Structure Overview:

ROLES & HIERARCHY:
- FEDEX_ADMIN: Top-level administrators (can see all cases across all organizations)
- DCA_MANAGER: Middle management at debt collection agencies (can see/manage their organization's cases)
- DCA_AGENT: Front-line agents at debt collection agencies (can see/update their organization's cases)

AUTHENTICATION FLOW:
1. User signs up selecting: "FedEx Administrator" | "Agency Manager" | "Agency Agent"
2. Trigger function automatically assigns:
   - "FedEx Administrator" → FEDEX_ADMIN role + FEDEX_HQ organization
   - "Agency Manager" → DCA_MANAGER role + DCA_8f3d1 organization
   - "Agency Agent" → DCA_AGENT role + DCA_9a2b4 organization
   - Default/Empty → DCA_AGENT role + DCA_7c1d2 organization (fallback)

ORGANIZATION IDs (Fixed Constants):
- FEDEX_HQ: FedEx headquarters (assigned to all FedEx Administrators)
- DCA_8f3d1: Agency Manager organization (consistent assignment)
- DCA_9a2b4: Agency Agent organization (consistent assignment)  
- DCA_7c1d2: Default/fallback organization (for edge cases)

ROW LEVEL SECURITY (RLS) POLICIES:
- FedEx Admins: Can view/modify ALL cases regardless of organization
- DCA Managers: Can view/modify cases only within their organization (DCA_8f3d1)
- DCA Agents: Can view/update cases only within their organization (DCA_9a2b4 or DCA_7c1d2)
- Case Actions: Users can only insert actions and view actions for cases they have access to

CASE STATUS WORKFLOW:
- OPEN: New case, no action taken
- IN_PROGRESS: Case being actively worked
- PAID: Customer has paid, case resolved
- DISPUTE: Customer disputes the debt

PRIORITY LEVELS:
- HIGH: Urgent cases requiring immediate attention
- MEDIUM: Standard priority cases
- LOW: Lower priority cases

The trigger function ensures consistent role and organization assignment based on the dropdown selection during signup.
*/