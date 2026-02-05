# Database Scripts & Backups

This folder contains all database-related scripts and data backups for the FedEx DCA Platform.

## 📁 Files Overview

### Data Files
- **`cleaned_data.csv`** - Cleaned dataset backup (20,000 cases)
  - This is your backup copy of all case data
  - Use this to restore the database if needed
  - Contains properly formatted data with correct enum values

### Python Scripts
- **`clean_csv.py`** - Data cleaning script
  - Converts raw CSV data to match database schema
  - Fixes enum values (case_status, priority_level)
  - Ensures data consistency

- **`import_csv.py`** - CSV to Supabase import script
  - Reads cleaned_data.csv
  - Imports data directly into Supabase using the API
  - Handles bulk insert operations

### SQL Scripts
- **`import_data.sql`** - SQL-based data import
  - Direct PostgreSQL COPY command for fast import
  - Temporarily disables RLS for data loading
  - Re-enables RLS after import

## 🔄 How to Use

### Restore Database from Backup
```bash
# Option 1: Using SQL (Fastest)
cd /Volumes/T7/FedEx_iitmadras
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f database/import_data.sql

# Option 2: Using Python script
cd /Volumes/T7/FedEx_iitmadras/database
python3 import_csv.py
```

### Clean New Raw Data
```bash
cd /Volumes/T7/FedEx_iitmadras/database
python3 clean_csv.py
# This will create a new cleaned_data.csv file
```

## 📊 Database Info
- **Total Cases**: 20,010
- **Case Distribution**:
  - DCA_A: ~4,954 cases
  - DCA_B: ~5,058 cases
  - DCA_C: ~4,913 cases
  - DCA_D: ~5,075 cases
  - Others: ~10 cases (test data)

## ⚠️ Important Notes
- Always keep `cleaned_data.csv` as a backup
- Don't delete this file - it's your data safety net
- If database gets corrupted, you can restore from this CSV
- The original `fedex_dca_enriched_dataset.csv` has been removed (no longer needed)

## 🗄️ Database Schema
For complete database schema documentation, see `/DATABASE.md` and `/DATABASE_SCHEMA.md` in the project root.
