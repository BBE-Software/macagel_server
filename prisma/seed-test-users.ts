import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Test kullanıcıları oluşturuluyor...');

  // Önce user_roles kontrolü
  let playerRole = await prisma.userRoles.findUnique({
    where: { name: 'player' }
  });

  if (!playerRole) {
    playerRole = await prisma.userRoles.create({
      data: {
        name: 'player',
        label: 'Oyuncu',
        description: 'Normal oyuncu hesabı'
      }
    });
    console.log('✅ Player role oluşturuldu');
  }

  // Test kullanıcıları
  const testUsers = [
    {
      email: 'ali@test.com',
      name: 'Ali',
      surname: 'Yılmaz',
      nickname: 'ali_yilmaz',
      birthday: new Date('1995-01-15'),
      gender: 'erkek',
      country_code: 'TR',
      role_name: 'player',
      is_active: true
    },
    {
      email: 'mehmet@test.com',
      name: 'Mehmet',
      surname: 'Özkan',
      nickname: 'mehmet_ozkan',
      birthday: new Date('1992-05-20'),
      gender: 'erkek',
      country_code: 'TR',
      role_name: 'player',
      is_active: true
    },
    {
      email: 'fatma@test.com',
      name: 'Fatma',
      surname: 'Kaya',
      nickname: 'fatma_kaya',
      birthday: new Date('1998-08-10'),
      gender: 'kadın',
      country_code: 'TR',
      role_name: 'player',
      is_active: true
    },
    {
      email: 'ahmet@test.com',
      name: 'Ahmet',
      surname: 'Demir',
      nickname: 'ahmet_demir',
      birthday: new Date('1990-12-05'),
      gender: 'erkek',
      country_code: 'TR',
      role_name: 'player',
      is_active: true
    },
    {
      email: 'ayse@test.com',
      name: 'Ayşe',
      surname: 'Çelik',
      nickname: 'ayse_celik',
      birthday: new Date('1996-03-25'),
      gender: 'kadın',
      country_code: 'TR',
      role_name: 'player',
      is_active: true
    }
  ];

  for (const userData of testUsers) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (!existingUser) {
        const user = await prisma.user.create({
          data: userData
        });
        console.log(`✅ Kullanıcı oluşturuldu: ${user.name} ${user.surname} (${user.email})`);
      } else {
        console.log(`⚠️  Kullanıcı zaten var: ${userData.email}`);
      }
    } catch (error) {
      console.error(`❌ Kullanıcı oluşturulurken hata: ${userData.email}`, error);
    }
  }

  console.log('🎉 Test kullanıcıları hazır!');
}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });