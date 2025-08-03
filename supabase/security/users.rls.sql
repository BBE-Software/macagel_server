ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- SELECT: Aktif kullanıcılar görülebilir; is_private ise sadece arkadaşları tüm bilgileri görebilir
CREATE POLICY users_select_policy
ON public.users
FOR SELECT
USING (
  is_active = true AND (
    id = auth.uid()
    OR is_private = false 
    OR EXISTS (
      SELECT 1 FROM public.user_friends f
      WHERE (
        (f.user_id = auth.uid() AND f.friend_id = users.id)
        OR
        (f.friend_id = auth.uid() AND f.user_id = users.id)
      )
    )
  )
);

-- UPDATE: Sadece kendi profilini güncelleyebilir
CREATE POLICY users_update_self
ON public.users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- DELETE: Silme işlemi tamamen devre dışı
CREATE POLICY users_delete_none
ON public.users
FOR DELETE
USING (false);
