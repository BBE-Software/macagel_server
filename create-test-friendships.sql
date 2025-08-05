-- Test kullanıcıları arasında arkadaşlık kuralım

-- Ali ve Mehmet arkadaş olsun
INSERT INTO friends (id, user1_id, user2_id, created_at) 
SELECT 
    gen_random_uuid(),
    ali.id,
    mehmet.id,
    NOW()
FROM users ali, users mehmet 
WHERE ali.email = 'ali@test.com' 
AND mehmet.email = 'mehmet@test.com'
ON CONFLICT DO NOTHING;

-- Ali ve Fatma arkadaş olsun  
INSERT INTO friends (id, user1_id, user2_id, created_at)
SELECT 
    gen_random_uuid(),
    ali.id,
    fatma.id,
    NOW()
FROM users ali, users fatma 
WHERE ali.email = 'ali@test.com' 
AND fatma.email = 'fatma@test.com'
ON CONFLICT DO NOTHING;

-- Mehmet ve Ahmet arkadaş olsun
INSERT INTO friends (id, user1_id, user2_id, created_at)
SELECT 
    gen_random_uuid(),
    mehmet.id,
    ahmet.id,
    NOW()
FROM users mehmet, users ahmet 
WHERE mehmet.email = 'mehmet@test.com' 
AND ahmet.email = 'ahmet@test.com'  
ON CONFLICT DO NOTHING;