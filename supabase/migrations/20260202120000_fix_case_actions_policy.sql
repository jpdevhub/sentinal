-- Fix case_actions RLS policy to allow inserts without performed_by (for system actions)
DROP POLICY IF EXISTS "Log Actions" ON public.case_actions;

-- Allow FedEx Admin to insert case actions (for system/admin operations)
CREATE POLICY "FedEx Admin Insert Actions"
ON public.case_actions FOR INSERT
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'FEDEX_ADMIN'
);

-- Allow users to insert their own actions
CREATE POLICY "Users Insert Own Actions"
ON public.case_actions FOR INSERT
WITH CHECK (
  performed_by IS NULL OR performed_by = auth.uid()
);

-- Allow FedEx Admin to update any case (including reassignment)
DROP POLICY IF EXISTS "FedEx Admin Modify All" ON public.cases;
CREATE POLICY "FedEx Admin Full Access"
ON public.cases FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'FEDEX_ADMIN'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'FEDEX_ADMIN'
);
