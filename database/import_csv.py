#!/usr/bin/env python3
import csv
import os
import sys
from datetime import datetime, timedelta
import random

# Supabase connection (assuming you have supabase-py installed)
try:
    from supabase import create_client, Client
except ImportError:
    print("Please install supabase-py: pip install supabase")
    sys.exit(1)

# Supabase configuration
SUPABASE_URL = "http://127.0.0.1:54321"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

def clean_csv_data(csv_path):
    """Read and clean the CSV data"""
    cases = []
    
    print(f"Reading CSV from: {csv_path}")
    
    with open(csv_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row_num, row in enumerate(reader, 1):
            if row_num % 1000 == 0:
                print(f"Processed {row_num} rows...")
            
            try:
                # Map CSV columns to database schema
                case_data = {
                    'case_id': row['case_id'],
                    'customer_id': row['customer_id'],
                    'customer_name': row['customer_name'],
                    'invoice_amount': float(row['invoice_amount']) if row['invoice_amount'] else 0,
                    'amount_recovered': float(row['amount_recovered']) if row['amount_recovered'] else 0,
                    'days_overdue': int(row['days_overdue']) if row['days_overdue'] else 0,
                    'case_status': map_case_status(row['case_status']),
                    'customer_type': row['customer_type'],
                    'credit_score': int(row['credit_score']) if row['credit_score'] else None,
                    'past_recovery_rate': float(row['past_recovery_rate']) if row['past_recovery_rate'] else None,
                    'dispute_history': int(row['dispute_history']) if row['dispute_history'] else 0,
                    'risk_score': float(row['risk_score']) if row['risk_score'] else 0,
                    'priority_level': map_priority_level(row['priority_level']),
                    'dca_id': row['dca_id'],
                    'dca_performance_score': int(row['dca_performance_score']) if row['dca_performance_score'] else None,
                    'assigned_date': parse_date(row['assigned_date']),
                    'case_created_date': parse_date(row['case_created_date']),
                    'payment_date': parse_date(row['payment_date']) if row['payment_date'] else None,
                    'case_closed_date': parse_date(row['case_closed_date']) if row['case_closed_date'] else None,
                    'recovered': bool(int(row['recovered'])) if row['recovered'] else False,
                    'sla_breach_count': int(row['sla_breach_count']) if row['sla_breach_count'] else 0,
                    'escalation_flag': bool(int(row['escalation_flag'])) if row['escalation_flag'] else False,
                    'escalation_reason': row['escalation_reason'] if row['escalation_reason'] else None,
                    'action_count': int(row['action_count']) if row['action_count'] else 0,
                    'last_action_type': row['last_action_type'] if row['last_action_type'] else None,
                    'last_action_date': parse_date(row['last_action_date']) if row['last_action_date'] else None,
                    'next_followup_date': parse_date(row['next_followup_date']) if row['next_followup_date'] else None
                }
                
                cases.append(case_data)
                
            except Exception as e:
                print(f"Error processing row {row_num}: {e}")
                continue
    
    print(f"Successfully processed {len(cases)} cases")
    return cases

def map_case_status(status):
    """Map CSV status to database enum"""
    status_mapping = {
        'Open': 'OPEN',
        'Closed': 'PAID',
        'Legal Action': 'DISPUTE',
        'In Progress': 'IN_PROGRESS'
    }
    return status_mapping.get(status, 'OPEN')

def map_priority_level(priority):
    """Map CSV priority to database enum"""
    priority_mapping = {
        'High': 'HIGH',
        'Medium': 'MEDIUM',
        'Low': 'LOW'
    }
    return priority_mapping.get(priority, 'MEDIUM')

def parse_date(date_str):
    """Parse date string to ISO format"""
    if not date_str:
        return None
    
    try:
        # Try multiple date formats
        for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y']:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.isoformat()
            except ValueError:
                continue
        
        # If all formats fail, return None
        return None
    except Exception:
        return None

def batch_insert_cases(supabase: Client, cases, batch_size=100):
    """Insert cases in batches"""
    total_cases = len(cases)
    successful_inserts = 0
    
    for i in range(0, total_cases, batch_size):
        batch = cases[i:i+batch_size]
        
        try:
            # Insert batch
            result = supabase.table('cases').insert(batch).execute()
            successful_inserts += len(batch)
            print(f"Inserted batch {i//batch_size + 1}: {len(batch)} cases (Total: {successful_inserts}/{total_cases})")
            
        except Exception as e:
            print(f"Error inserting batch {i//batch_size + 1}: {e}")
            
            # Try individual inserts for this batch
            for case in batch:
                try:
                    supabase.table('cases').insert(case).execute()
                    successful_inserts += 1
                except Exception as individual_error:
                    print(f"Failed to insert case {case['case_id']}: {individual_error}")
    
    print(f"Total successful inserts: {successful_inserts}/{total_cases}")
    return successful_inserts

def main():
    # CSV file path
    csv_path = "/Volumes/T7/FedEx_iitmadras/public/fedex_dca_enriched_dataset.csv"
    
    if not os.path.exists(csv_path):
        print(f"CSV file not found: {csv_path}")
        return
    
    # Initialize Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("Starting CSV import process...")
    
    # Clean and prepare data
    cases = clean_csv_data(csv_path)
    
    if not cases:
        print("No cases to import")
        return
    
    print(f"Importing {len(cases)} cases to Supabase...")
    
    # Import to database
    successful = batch_insert_cases(supabase, cases)
    
    print(f"Import completed: {successful} cases imported successfully")

if __name__ == "__main__":
    main()