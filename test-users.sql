-- Test kullanıcıları oluşturmak için SQL komutları

-- Önce user_roles tablosuna default role ekleyelim (eğer yoksa)
INSERT INTO user_roles (name, label, description) 
VALUES ('player', 'Oyuncu', 'Normal oyuncu hesabı') 
ON CONFLICT (name) DO NOTHING;

-- Test kullanıcıları ekleyelim
INSERT INTO users (
  id, 
  email, 
  name, 
  surname, 
  nickname, 
  birthday, 
  gender, 
  country_code, 
  role_name,
  is_active
) VALUES 
(
  gen_random_uuid(),
  'ali@test.com',
  'Ali',
  'Yılmaz', 
  'ali_yilmaz',
  '1995-01-15',
  'erkek',
  'TR',
  'player',
  true
),
(
  gen_random_uuid(),
  'mehmet@test.com',
  'Mehmet',
  'Özkan',
  'mehmet_ozkan', 
  '1992-05-20',
  'erkek',
  'TR',
  'player',
  true
),
(
  gen_random_uuid(),
  'fatma@test.com',
  'Fatma',
  'Kaya',
  'fatma_kaya',
  '1998-08-10',
  'kadın', 
  'TR',
  'player',
  true
),
(
  gen_random_uuid(),
  'ahmet@test.com',
  'Ahmet',
  'Demir',
  'ahmet_demir',
  '1990-12-05',
  'erkek',
  'TR', 
  'player',
  true
),
(
  gen_random_uuid(),
  'ayse@test.com',
  'Ayşe',
  'Çelik',
  'ayse_celik',
  '1996-03-25',
  'kadın',
  'TR',
  'player', 
  true
)
ON CONFLICT (email) DO NOTHING;