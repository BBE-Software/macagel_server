ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin ve Super Admin kullanıcılar tüm rolleri görebilir
CREATE POLICY select_user_roles_if_admin
  ON public.user_roles
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE role_id IN ('admin', 'super-admin')
    )
  );

-- INSERT: Sadece Super Admin rolü kullanıcı rol atayabilir
CREATE POLICY insert_user_roles_if_superadmin
  ON public.user_roles
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE role_id = 'super-admin'
    )
  );

-- UPDATE: Sadece Super Admin rolü kullanıcı rol güncelleyebilir
CREATE POLICY update_user_roles_if_superadmin
  ON public.user_roles
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE role_id = 'super-admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE role_id = 'super-admin'
    )
  );

-- DELETE: Sadece Super Admin rolü kullanıcı rol silebilir
CREATE POLICY delete_user_roles_if_superadmin
  ON public.user_roles
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE role_id = 'super-admin'
    )
  );
