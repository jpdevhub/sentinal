/**
 * Import cases data to Production Supabase
 * Run: node import_to_production.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// PRODUCTION Supabase configuration
// Get these from: Supabase Dashboard > Project Settings > API
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kmpwwmktnppuldrchdli.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.log('='.repeat(60));
  console.log('ERROR: SUPABASE_SERVICE_KEY environment variable not set!');
  console.log('='.repeat(60));
  console.log('\nTo get your service role key:');
  console.log('1. Go to https://supabase.com/dashboard/project/kmpwwmktnppuldrchdli/settings/api');
  console.log('2. Copy the "service_role" secret key (NOT the anon key)');
  console.log('3. Run: export SUPABASE_SERVICE_KEY="your_key_here"');
  console.log('4. Then run this script again: node database/import_to_production.mjs');
  process.exit(1);
}

// Helper functions
function parseFloat2(val) {
  if (!val || val.trim() === '') return 0.0;
  const num = parseFloat(val);
  return isNaN(num) ? 0.0 : num;
}

function parseInt2(val) {
  if (!val || val.trim() === '') return 0;
  const num = parseInt(val);
  return isNaN(num) ? 0 : num;
}

function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  try {
    const date = new Date(dateStr.trim());
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch {
    return null;
  }
}

function parseBool(val) {
  if (!val) return false;
  const str = String(val).toLowerCase().trim();
  return ['true', '1', 'yes', 't'].includes(str);
}

async function main() {
  console.log('='.repeat(60));
  console.log('FedEx DCA - Import Cases to Production Supabase');
  console.log('='.repeat(60));

  // Connect to Supabase
  console.log(`\nConnecting to: ${SUPABASE_URL}`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Read CSV file
  const csvPath = join(__dirname, 'database', 'cleaned_data.csv');
  console.log(`Reading CSV from: ${csvPath}`);
  
  const csvContent = readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });

  console.log(`Total records in CSV: ${records.length}`);

  // Transform records
  const cases = records.map((row, index) => {
    if ((index + 1) % 5000 === 0) {
      console.log(`Processed ${index + 1} records...`);
    }

    let caseStatus = (row.case_status || 'OPEN').trim().toUpperCase();
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'PAID', 'DISPUTE'];
    if (!validStatuses.includes(caseStatus)) caseStatus = 'OPEN';

    let priorityLevel = (row.priority_level || 'MEDIUM').trim().toUpperCase();
    const validPriorities = ['HIGH', 'MEDIUM', 'LOW'];
    if (!validPriorities.includes(priorityLevel)) priorityLevel = 'MEDIUM';

    return {
      case_id: row.case_id?.trim() || '',
      customer_id: row.customer_id?.trim() || '',
      customer_name: row.customer_name?.trim() || '',
      invoice_amount: parseFloat2(row.invoice_amount),
      amount_recovered: parseFloat2(row.amount_recovered),
      days_overdue: parseInt2(row.days_overdue),
      case_status: caseStatus,
      customer_type: row.customer_type?.trim() || '',
      credit_score: parseInt2(row.credit_score),
      past_recovery_rate: parseFloat2(row.past_recovery_rate),
      dispute_history: parseInt2(row.dispute_history),
      risk_score: parseFloat2(row.risk_score),
      priority_level: priorityLevel,
      dca_id: row.dca_id?.trim() || '',
      dca_performance_score: parseInt2(row.dca_performance_score),
      assigned_date: parseDate(row.assigned_date),
      case_created_date: parseDate(row.case_created_date),
      payment_date: parseDate(row.payment_date),
      case_closed_date: parseDate(row.case_closed_date),
      recovered: parseBool(row.recovered),
      action_count: parseInt2(row.action_count),
      last_action_type: row.last_action_type?.trim() || null,
      sla_breach_count: parseInt2(row.sla_breach_count),
      escalation_flag: parseBool(row.escalation_flag),
      escalation_reason: row.escalation_reason?.trim() || null,
      last_action_date: parseDate(row.last_action_date),
      next_followup_date: parseDate(row.next_followup_date),
    };
  }).filter(c => c.case_id);

  console.log(`\nCases to import: ${cases.length}`);

  // Clear existing data
  console.log('\nClearing existing cases in production...');
  try {
    const { error } = await supabase.from('cases').delete().neq('case_id', 'NEVER_MATCH');
    if (error) throw error;
    console.log('Existing cases cleared.');
  } catch (err) {
    console.log(`Warning: Could not clear existing cases: ${err.message}`);
  }

  // Insert in batches
  const BATCH_SIZE = 500;
  let totalInserted = 0;
  const errors = [];

  console.log(`\nInserting cases in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < cases.length; i += BATCH_SIZE) {
    const batch = cases.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(cases.length / BATCH_SIZE);

    try {
      const { error } = await supabase.from('cases').upsert(batch, { onConflict: 'case_id' });
      if (error) throw error;
      
      totalInserted += batch.length;
      console.log(`Batch ${batchNum}/${totalBatches}: Inserted ${batch.length} cases (Total: ${totalInserted})`);
    } catch (err) {
      errors.push(`Batch ${batchNum}: ${err.message}`);
      console.log(`Error in batch ${batchNum}: ${err.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total cases imported: ${totalInserted}`);
  
  if (errors.length > 0) {
    console.log(`Errors encountered: ${errors.length}`);
    errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
  } else {
    console.log('No errors encountered!');
  }

  // Verify count
  try {
    const { count } = await supabase.from('cases').select('*', { count: 'exact', head: true });
    console.log(`Cases in production database: ${count}`);
  } catch (err) {
    console.log(`Could not verify count: ${err.message}`);
  }
}

main().catch(console.error);
