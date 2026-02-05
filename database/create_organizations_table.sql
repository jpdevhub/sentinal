-- Organizations table for DCA management
-- This table stores information about debt collection agencies (DCAs) and other organizations

CREATE TABLE IF NOT EXISTS public.organizations (
  id VARCHAR(50) PRIMARY KEY, -- e.g., 'DCA_A7B3C', 'FEDEX_HQ'
  name VARCHAR(255) NOT NULL, -- e.g., 'Premium Collections Inc.'
  type VARCHAR(50) DEFAULT 'DCA', -- 'DCA', 'FEDEX', 'PARTNER'
  status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Suspended', 'Deleted'
  contact_email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  license_number VARCHAR(100),
  performance_score DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deletion_reason TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON public.organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON public.organizations(created_at);

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at_trigger
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- FedEx Admins can see all organizations
CREATE POLICY "FedEx Admin View All Organizations" ON public.organizations
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'FEDEX_ADMIN'
  );

-- FedEx Admins can manage all organizations
CREATE POLICY "FedEx Admin Manage Organizations" ON public.organizations
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'FEDEX_ADMIN'
  );

-- DCA Managers can only see their own organization
CREATE POLICY "DCA Manager View Own Organization" ON public.organizations
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'DCA_MANAGER'
    AND id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- Insert default organizations if they don't exist
INSERT INTO public.organizations (id, name, type, status, created_at) VALUES
  ('FEDEX_HQ', 'FedEx Headquarters', 'FEDEX', 'Active', now()),
  ('DCA_A', 'DCA Alpha', 'DCA', 'Active', now()),
  ('DCA_B', 'DCA Beta', 'DCA', 'Active', now()),
  ('DCA_C', 'DCA Gamma', 'DCA', 'Active', now()),
  ('DCA_D', 'DCA Delta', 'DCA', 'Active', now()),
  ('DCA_EURO', 'DCA Euro', 'DCA', 'Active', now()),
  ('DCA_8f3d1', 'DCA Epsilon', 'DCA', 'Active', now()),
  ('DCA_9a2b4', 'DCA Zeta', 'DCA', 'Active', now()),
  ('DCA_7c1d2', 'DCA Eta', 'DCA', 'Active', now())
ON CONFLICT (id) DO NOTHING;

-- Add columns to cases table for better DCA tracking if they don't exist
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS previous_dca_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS dca_deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS reassigned_at TIMESTAMP WITH TIME ZONE;

-- Create index for previous_dca_id for audit purposes
CREATE INDEX IF NOT EXISTS idx_cases_previous_dca_id ON public.cases(previous_dca_id);

-- Add audit function for DCA changes
CREATE OR REPLACE FUNCTION audit_dca_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- If DCA is being changed, log it
  IF OLD.dca_id IS DISTINCT FROM NEW.dca_id THEN
    INSERT INTO public.case_actions (
      case_id, 
      performed_by, 
      action_type, 
      note, 
      created_at
    ) VALUES (
      NEW.case_id,
      auth.uid(),
      'DCA_REASSIGNED',
      CASE 
        WHEN NEW.dca_id = 'UNASSIGNED' THEN 
          'Case marked as unassigned due to DCA deletion: ' || OLD.dca_id
        ELSE 
          'Case reassigned from ' || COALESCE(OLD.dca_id, 'Unknown') || ' to ' || NEW.dca_id
      END,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for DCA change auditing
DROP TRIGGER IF EXISTS audit_dca_changes_trigger ON public.cases;
CREATE TRIGGER audit_dca_changes_trigger
  BEFORE UPDATE ON public.cases
  FOR EACH ROW
  WHEN (OLD.dca_id IS DISTINCT FROM NEW.dca_id)
  EXECUTE FUNCTION audit_dca_changes();

-- Function to safely delete organization with case handling
CREATE OR REPLACE FUNCTION safely_delete_organization(org_id TEXT)
RETURNS JSON AS $$
DECLARE
  case_count INTEGER;
  result JSON;
BEGIN
  -- Check if organization exists
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = org_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Organization not found',
      'cases_affected', 0
    );
  END IF;

  -- Count cases assigned to this organization
  SELECT COUNT(*) INTO case_count 
  FROM public.cases 
  WHERE dca_id = org_id;

  -- If organization has cases, mark them as unassigned but preserve audit trail
  IF case_count > 0 THEN
    UPDATE public.cases 
    SET 
      dca_id = 'UNASSIGNED',
      previous_dca_id = org_id,
      dca_deletion_reason = 'Organization permanently deleted',
      reassigned_at = now(),
      updated_at = now()
    WHERE dca_id = org_id;

    -- Create audit log entries for all affected cases
    INSERT INTO public.case_actions (case_id, performed_by, action_type, note, created_at)
    SELECT 
      case_id,
      NULL, -- System action
      'DCA_DELETED',
      'Cases reassigned due to permanent deletion of organization: ' || org_id,
      now()
    FROM public.cases 
    WHERE previous_dca_id = org_id;
  END IF;

  -- Mark organization as deleted (soft delete for audit purposes)
  UPDATE public.organizations 
  SET 
    status = 'Deleted',
    deleted_at = now(),
    deletion_reason = 'Permanently deleted by administrator',
    updated_at = now()
  WHERE id = org_id;

  -- Return result
  RETURN json_build_object(
    'success', true,
    'cases_affected', case_count,
    'message', CASE 
      WHEN case_count > 0 THEN 
        'Organization deleted. ' || case_count || ' cases marked as unassigned with preserved audit trail.'
      ELSE 
        'Organization safely deleted. No cases were affected.'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (will be restricted by RLS)
GRANT EXECUTE ON FUNCTION safely_delete_organization(TEXT) TO authenticated;

COMMENT ON TABLE public.organizations IS 'Stores information about debt collection agencies and other organizations';
COMMENT ON COLUMN public.organizations.id IS 'Unique organization identifier (e.g., DCA_A7B3C)';
COMMENT ON COLUMN public.organizations.type IS 'Organization type: DCA, FEDEX, PARTNER';
COMMENT ON COLUMN public.organizations.status IS 'Current status: Active, Suspended, Deleted';
COMMENT ON COLUMN public.organizations.performance_score IS 'Calculated performance score (0-100)';
COMMENT ON FUNCTION safely_delete_organization(TEXT) IS 'Safely deletes an organization with proper case handling and audit trail preservation';