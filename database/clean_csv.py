#!/usr/bin/env python3
import csv
import os

def clean_and_convert_csv():
    input_path = "/Volumes/T7/FedEx_iitmadras/public/fedex_dca_enriched_dataset.csv"
    output_path = "/Volumes/T7/FedEx_iitmadras/cleaned_data.csv"
    
    print(f"Processing {input_path}")
    
    # Status mappings
    status_mapping = {
        'Open': 'OPEN',
        'Closed': 'PAID',
        'Legal Action': 'DISPUTE',
        'In Progress': 'IN_PROGRESS',
        '': 'OPEN'  # Default for empty values
    }
    
    # Priority mappings
    priority_mapping = {
        'High': 'HIGH',
        'Medium': 'MEDIUM', 
        'Low': 'LOW',
        '': 'MEDIUM'  # Default for empty values
    }
    
    with open(input_path, 'r', encoding='utf-8') as infile, open(output_path, 'w', encoding='utf-8', newline='') as outfile:
        reader = csv.DictReader(infile)
        
        # Define output fieldnames in the order our database expects
        fieldnames = [
            'case_id', 'invoice_amount', 'days_overdue', 'customer_type',
            'credit_score', 'past_recovery_rate', 'dispute_history', 'dca_id',
            'dca_performance_score', 'sla_breach_count', 'recovered', 'customer_id',
            'customer_name', 'case_created_date', 'assigned_date', 'case_status',
            'amount_recovered', 'payment_date', 'case_closed_date', 'risk_score',
            'priority_level', 'action_count', 'last_action_type', 'last_action_date',
            'next_followup_date', 'escalation_flag', 'escalation_reason'
        ]
        
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for row_num, row in enumerate(reader, 1):
            if row_num % 1000 == 0:
                print(f"Processed {row_num} rows...")
            
            try:
                # Convert boolean fields
                recovered = '1' if str(row.get('recovered', '0')).strip() == '1' else '0'
                escalation_flag = '1' if str(row.get('escalation_flag', '0')).strip() == '1' else '0'
                
                # Convert status and priority
                case_status = status_mapping.get(row.get('case_status', '').strip(), 'OPEN')
                priority_level = priority_mapping.get(row.get('priority_level', '').strip(), 'MEDIUM')
                
                # Clean data and write row
                cleaned_row = {
                    'case_id': row.get('case_id', '').strip(),
                    'invoice_amount': row.get('invoice_amount', '0').strip() or '0',
                    'days_overdue': row.get('days_overdue', '0').strip() or '0',
                    'customer_type': row.get('customer_type', '').strip(),
                    'credit_score': row.get('credit_score', '').strip() or '',
                    'past_recovery_rate': row.get('past_recovery_rate', '').strip() or '',
                    'dispute_history': row.get('dispute_history', '0').strip() or '0',
                    'dca_id': row.get('dca_id', '').strip(),
                    'dca_performance_score': row.get('dca_performance_score', '').strip() or '',
                    'sla_breach_count': row.get('sla_breach_count', '0').strip() or '0',
                    'recovered': recovered,
                    'customer_id': row.get('customer_id', '').strip(),
                    'customer_name': row.get('customer_name', '').strip(),
                    'case_created_date': row.get('case_created_date', '').strip(),
                    'assigned_date': row.get('assigned_date', '').strip(),
                    'case_status': case_status,
                    'amount_recovered': row.get('amount_recovered', '0').strip() or '0',
                    'payment_date': row.get('payment_date', '').strip() if row.get('payment_date', '').strip() else '',
                    'case_closed_date': row.get('case_closed_date', '').strip() if row.get('case_closed_date', '').strip() else '',
                    'risk_score': row.get('risk_score', '0').strip() or '0',
                    'priority_level': priority_level,
                    'action_count': row.get('action_count', '0').strip() or '0',
                    'last_action_type': row.get('last_action_type', '').strip(),
                    'last_action_date': row.get('last_action_date', '').strip(),
                    'next_followup_date': row.get('next_followup_date', '').strip(),
                    'escalation_flag': escalation_flag,
                    'escalation_reason': row.get('escalation_reason', '').strip()
                }
                
                writer.writerow(cleaned_row)
                
            except Exception as e:
                print(f"Error processing row {row_num}: {e}")
                continue
    
    print(f"Cleaned CSV saved to: {output_path}")
    return output_path

if __name__ == "__main__":
    clean_and_convert_csv()