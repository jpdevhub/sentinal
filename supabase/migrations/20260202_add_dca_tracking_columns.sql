-- Add DCA tracking columns for case reassignment
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS previous_dca_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS reassigned_at TIMESTAMP WITH TIME ZONE;

-- Create index for previous_dca_id for audit purposes
CREATE INDEX IF NOT EXISTS idx_cases_previous_dca_id ON public.cases(previous_dca_id);

-- Comment for documentation
COMMENT ON COLUMN public.cases.previous_dca_id IS 'Stores the previous DCA ID when a case is reassigned';
COMMENT ON COLUMN public.cases.reassigned_at IS 'Timestamp when the case was reassigned from one DCA to another';
