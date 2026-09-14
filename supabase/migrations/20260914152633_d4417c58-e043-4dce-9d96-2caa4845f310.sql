ALTER TABLE public.opportunities ADD COLUMN created_by uuid;

CREATE POLICY "partners insert own opportunities" ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'partner') OR public.has_role(auth.uid(),'admin')) AND created_by = auth.uid());
CREATE POLICY "owners update opportunities" ON public.opportunities FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owners delete opportunities" ON public.opportunities FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "opportunity owner reads applications" ON public.applications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id AND (o.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "opportunity owner updates applications" ON public.applications FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id AND (o.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id AND (o.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));