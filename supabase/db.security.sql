-- user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_user_roles_if_admin
  ON public.user_roles
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role_id IN ('admin', 'super_admin')
    )
  );

CREATE POLICY insert_user_roles_if_superadmin
  ON public.user_roles
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role_id = 'super_admin'
    )
  );

CREATE POLICY update_user_roles_if_superadmin
  ON public.user_roles
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role_id = 'super_admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role_id = 'super_admin'
    )
  );

CREATE POLICY delete_user_roles_if_superadmin
  ON public.user_roles
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role_id = 'super_admin'
    )
  );
