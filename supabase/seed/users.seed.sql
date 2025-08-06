INSERT INTO public.users (
  id,
  email,
  name,
  surname,
  nickname,
  birthday,
  height,
  weight,
  gender,
  show_gender,
  show_height,
  show_weight,
  country_code,
  is_private,
  is_active,
  current_latitude,
  current_longitude,
  created_at,
  updated_at,
  role_name
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'test1@example.com',
    'Test', 'User1', 'test1', '2000-01-01',
    180, 75, 'male', true, true, true,
    'TR', false, true, 41.015, 28.979,
    now(), now(), 'user'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'test2@example.com',
    'Test', 'User2', 'test2', '1995-03-15',
    170, 65, 'female', true, true, true,
    'TR', false, true, 40.015, 29.000,
    now(), now(), 'admin'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'test3@example.com',
    'Test', 'User3', 'test3', '1988-08-20',
    NULL, NULL, 'male', false, false, false,
    'US', true, true, 34.052, -118.243,
    now(), now(), 'super-admin'
  ),
  (
    'd3ab535e-5eb5-4fb7-9c16-480a8fd11801',
    'berke@example.com',
    'Berke', 'Kucukoglu', 'berke2025', '1995-01-01',
    175, 70, 'male', true, true, true,
    'TR', false, true, 39.925, 32.837,
    now(), now(), 'user'
  );
