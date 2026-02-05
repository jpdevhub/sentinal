-- Create custom types
CREATE TYPE user_role AS ENUM ('FEDEX_ADMIN', 'DCA_MANAGER', 'DCA_AGENT');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role user_role NOT NULL DEFAULT 'DCA_AGENT',
    organization_id TEXT DEFAULT 'DCA_7c1d2' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create cases table to store debt collection cases
create table public.cases (
    id uuid default gen_random_uuid() primary key,
    case_id text unique not null,
    customer_name text not null,
    customer_id text not null,
    invoice_amount numeric not null,
    amount_recovered numeric default 0,
    days_overdue integer not null,
    case_status text not null check (case_status in ('Open', 'Closed', 'Escalated', 'Legal', 'Pending', 'Reviewed', 'Disputed')),
    priority_level text not null check (priority_level in ('High', 'Medium', 'Low')),
    risk_score numeric,
    dca_id text,
    sla_breach_count integer default 0,
    escalation_reason text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create RLS policies for cases
alter table public.cases enable row level security;

-- Policy: Users can view all cases (for now)
create policy "Users can view cases" on public.cases
    for select using (true);

-- Policy: Authenticated users can insert cases
create policy "Authenticated users can insert cases" on public.cases
    for insert with check (auth.role() = 'authenticated');

-- Policy: Authenticated users can update cases
create policy "Authenticated users can update cases" on public.cases
    for update using (auth.role() = 'authenticated');

-- Create RLS policies for profiles
alter table public.profiles enable row level security;

-- Policy: Users can view own profile
create policy "Users can view own profile" on public.profiles
    for select using (auth.uid() = id);

-- Policy: Users can update own profile
create policy "Users can update own profile" on public.profiles
    for update using (auth.uid() = id);

-- Function to handle user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, role, organization_id)
    values (
        new.id,
        CASE 
            WHEN new.raw_user_meta_data->>'organization_type' = 'FedEx Administrator' THEN 'FEDEX_ADMIN'::user_role
            WHEN new.raw_user_meta_data->>'organization_type' = 'Agency Manager' THEN 'DCA_MANAGER'::user_role
            WHEN new.raw_user_meta_data->>'organization_type' = 'Agency Agent' THEN 'DCA_AGENT'::user_role
            ELSE 'DCA_AGENT'::user_role
        END,
        CASE 
            WHEN new.raw_user_meta_data->>'organization_type' = 'FedEx Administrator' THEN 'FEDEX_HQ'
            WHEN new.raw_user_meta_data->>'organization_type' = 'Agency Manager' THEN 'DCA_8f3d1'
            WHEN new.raw_user_meta_data->>'organization_type' = 'Agency Agent' THEN 'DCA_9a2b4'
            ELSE 'DCA_7c1d2' -- Default for empty/hack cases
        END
    );
    return new;
end;
$$;

-- Trigger to create profile on user signup
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Create indexes for better performance
create index idx_cases_case_id on public.cases(case_id);
create index idx_cases_status on public.cases(case_status);
create index idx_cases_priority on public.cases(priority_level);
create index idx_cases_customer on public.cases(customer_name);
create index idx_cases_dca on public.cases(dca_id);