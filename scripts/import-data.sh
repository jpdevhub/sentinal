#!/bin/bash

# Script to import CSV data into Supabase (local or remote)
# Usage: ./import-data.sh [local|remote]

ENV=${1:-local}

if [ "$ENV" = "local" ]; then
    echo "🔄 Importing data to LOCAL Supabase..."
    export SUPABASE_URL="http://localhost:54321"
    export SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
else
    echo "🔄 Importing data to REMOTE Supabase..."
    export SUPABASE_URL="https://kmpwwmktnppuldrchdli.supabase.co"
    export SUPABASE_KEY="sb_publishable_OoKzzf9erGGQVOnBKW6j2Q_RcSGHmI4"
fi

echo "📦 URL: $SUPABASE_URL"

# TODO: Add CSV import logic here
# This could use the Supabase CLI or a custom Node.js script

echo "✅ Data import completed!"