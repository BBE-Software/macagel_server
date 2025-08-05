import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🤝 Test arkadaşlıkları oluşturuluyor...');

  // Test kullanıcılarını getir
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: ['ali@test.com', 'mehmet@test.com', 'fatma@test.com', 'ahmet@test.com', 'ayse@test.com']
      }
    }
  });

  const ali = users.find(u => u.email === 'ali@test.com');
  const mehmet = users.find(u => u.email === 'mehmet@test.com');
  const fatma = users.find(u => u.email === 'fatma@test.com');
  const ahmet = users.find(u => u.email === 'ahmet@test.com');
  const ayse = users.find(u => u.email === 'ayse@test.com');

  if (!ali || !mehmet || !fatma || !ahmet || !ayse) {
    console.error('❌ Test kullanıcıları bulunamadı!');
    return;
  }

  console.log('👥 Kullanıcılar bulundu:', users.map(u => u.email));

  // Arkadaşlıklar oluştur
  const friendships = [
    { user1: ali, user2: mehmet },
    { user1: ali, user2: fatma },
    { user1: mehmet, user2: ahmet },
    { user1: fatma, user2: ayse },
    { user1: ahmet, user2: ayse },
  ];

  for (const friendship of friendships) {
    try {
      // Zaten arkadaş mı kontrol et
      const existing = await prisma.friend.findFirst({
        where: {
          OR: [
            { user1_id: friendship.user1.id, user2_id: friendship.user2.id },
            { user1_id: friendship.user2.id, user2_id: friendship.user1.id },
          ]
        }
      });

      if (!existing) {
        await prisma.friend.create({
          data: {
            user1_id: friendship.user1.id,
            user2_id: friendship.user2.id,
          }
        });
        console.log(`✅ Arkadaşlık oluşturuldu: ${friendship.user1.name} ↔ ${friendship.user2.name}`);
      } else {
        console.log(`⚠️  Zaten arkadaş: ${friendship.user1.name} ↔ ${friendship.user2.name}`);
      }
    } catch (error) {
      console.error(`❌ Arkadaşlık oluşturulurken hata:`, error);
    }
  }

  console.log('🎉 Test arkadaşlıkları hazır!');
}

main()
  .catch((e) => {
    console.error('❌ Arkadaşlık oluşturma hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });