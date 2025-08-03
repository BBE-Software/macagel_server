ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SELECT: admin veya super-admin olan kullanıcılar görebilir
CREATE POLICY select_user_roles_if_admin
  ON public.user_roles
  FOR SELECT
  USING (
    role_name IN ('admin', 'super-admin') AND user_id = auth.uid()
  );

-- INSERT: sadece super-admin başkalarına rol atayabilir
CREATE POLICY insert_user_roles_if_superadmin
  ON public.user_roles
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles
      WHERE role_name = 'super-admin'
    )
  );

-- UPDATE: sadece super-admin güncelleyebilir
CREATE POLICY update_user_roles_if_superadmin
  ON public.user_roles
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles
      WHERE role_name = 'super-admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles
      WHERE role_name = 'super-admin'
    )
  );

-- DELETE: sadece super-admin silebilir
CREATE POLICY delete_user_roles_if_superadmin
  ON public.user_roles
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles
      WHERE role_name = 'super-admin'
    )
  );
