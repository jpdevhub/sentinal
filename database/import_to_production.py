#!/usr/bin/env python3
"""
Import cases data to Production Supabase
Run: python import_to_production.py
"""
import csv
import os
import sys
from datetime import datetime

# Supabase connection
try:
    from supabase import create_client, Client
except ImportError:
    print("Please install supabase-py: pip install supabase")
    sys.exit(1)

# PRODUCTION Supabase configuration
# Get these from: Supabase Dashboard > Project Settings > API
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://kmpwwmktnppuldrchdli.supabase.co")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")  # Use service role key for bulk inserts

if not SUPABASE_SERVICE_KEY:
    print("=" * 60)
    print("ERROR: SUPABASE_SERVICE_KEY environment variable not set!")
    print("=" * 60)
    print("\nTo get your service role key:")
    print("1. Go to https://supabase.com/dashboard/project/kmpwwmktnppuldrchdli/settings/api")
    print("2. Copy the 'service_role' secret key (NOT the anon key)")
    print("3. Run: export SUPABASE_SERVICE_KEY='your_key_here'")
    print("4. Then run this script again")
    sys.exit(1)

def parse_date(date_str):
    """Parse date string to ISO format"""
    if not date_str or date_str.strip() == '':
        return None
    try:
        return datetime.strptime(date_str.strip(), '%Y-%m-%d').isoformat()
    except:
        return None

def parse_float(val):
    """Parse float value"""
    if not val or val.strip() == '':
        return 0.0
    try:
        return float(val)
    except:
        return 0.0

def parse_int(val):
    """Parse int value"""
    if not val or val.strip() == '':
        return 0
    try:
        return int(float(val))
    except:
        return 0

def parse_bool(val):
    """Parse boolean value"""
    if not val:
        return False
    val_str = str(val).lower().strip()
    return val_str in ['true', '1', 'yes', 't']

def main():
    print("=" * 60)
    print("FedEx DCA - Import Cases to Production Supabase")
    print("=" * 60)
    
    # Connect to Supabase
    print(f"\nConnecting to: {SUPABASE_URL}")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Read CSV file
    csv_path = os.path.join(os.path.dirname(__file__), 'cleaned_data.csv')
    print(f"Reading CSV from: {csv_path}")
    
    cases = []
    with open(csv_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row_num, row in enumerate(reader, 1):
            if row_num % 1000 == 0:
                print(f"Processed {row_num} rows...")
            
            case = {
                'case_id': row.get('case_id', '').strip(),
                'customer_id': row.get('customer_id', '').strip(),
                'customer_name': row.get('customer_name', '').strip(),
                'invoice_amount': parse_float(row.get('invoice_amount')),
                'amount_recovered': parse_float(row.get('amount_recovered')),
                'days_overdue': parse_int(row.get('days_overdue')),
                'case_status': row.get('case_status', 'OPEN').strip().upper(),
                'customer_type': row.get('customer_type', '').strip(),
                'credit_score': parse_int(row.get('credit_score')),
                'past_recovery_rate': parse_float(row.get('past_recovery_rate')),
                'dispute_history': parse_int(row.get('dispute_history')),
                'risk_score': parse_float(row.get('risk_score')),
                'priority_level': row.get('priority_level', 'MEDIUM').strip().upper(),
                'dca_id': row.get('dca_id', '').strip(),
                'dca_performance_score': parse_int(row.get('dca_performance_score')),
                'assigned_date': parse_date(row.get('assigned_date')),
                'case_created_date': parse_date(row.get('case_created_date')),
                'payment_date': parse_date(row.get('payment_date')),
                'case_closed_date': parse_date(row.get('case_closed_date')),
                'recovered': parse_bool(row.get('recovered')),
                'action_count': parse_int(row.get('action_count')),
                'last_action_type': row.get('last_action_type', '').strip() or None,
                'sla_breach_count': parse_int(row.get('sla_breach_count')),
                'escalation_flag': parse_bool(row.get('escalation_flag')),
                'escalation_reason': row.get('escalation_reason', '').strip() or None,
                'last_action_date': parse_date(row.get('last_action_date')),
                'next_followup_date': parse_date(row.get('next_followup_date')),
            }
            
            # Validate case_status enum
            valid_statuses = ['OPEN', 'IN_PROGRESS', 'PAID', 'DISPUTE']
            if case['case_status'] not in valid_statuses:
                case['case_status'] = 'OPEN'
            
            # Validate priority_level enum
            valid_priorities = ['HIGH', 'MEDIUM', 'LOW']
            if case['priority_level'] not in valid_priorities:
                case['priority_level'] = 'MEDIUM'
            
            if case['case_id']:
                cases.append(case)
    
    print(f"\nTotal cases to import: {len(cases)}")
    
    # Clear existing data (optional - comment out if you don't want to clear)
    print("\nClearing existing cases in production...")
    try:
        supabase.table('cases').delete().neq('case_id', 'NEVER_MATCH_THIS').execute()
        print("Existing cases cleared.")
    except Exception as e:
        print(f"Warning: Could not clear existing cases: {e}")
    
    # Insert in batches
    BATCH_SIZE = 500
    total_inserted = 0
    errors = []
    
    print(f"\nInserting cases in batches of {BATCH_SIZE}...")
    
    for i in range(0, len(cases), BATCH_SIZE):
        batch = cases[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (len(cases) + BATCH_SIZE - 1) // BATCH_SIZE
        
        try:
            result = supabase.table('cases').upsert(batch, on_conflict='case_id').execute()
            total_inserted += len(batch)
            print(f"Batch {batch_num}/{total_batches}: Inserted {len(batch)} cases (Total: {total_inserted})")
        except Exception as e:
            errors.append(f"Batch {batch_num}: {str(e)}")
            print(f"Error in batch {batch_num}: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print("IMPORT COMPLETE")
    print("=" * 60)
    print(f"Total cases imported: {total_inserted}")
    if errors:
        print(f"Errors encountered: {len(errors)}")
        for err in errors[:5]:
            print(f"  - {err}")
    else:
        print("No errors encountered!")
    
    # Verify count
    try:
        count_result = supabase.table('cases').select('case_id', count='exact').execute()
        print(f"Cases in production database: {count_result.count}")
    except Exception as e:
        print(f"Could not verify count: {e}")

if __name__ == '__main__':
    main()
