import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test venues...');

  const venues = await prisma.futsalVenue.createMany({
    data: [
      {
        name: 'Taksim Spor Kompleksi',
        address: 'Taksim, Beyoğlu, İstanbul',
        latitude: 41.0369,
        longitude: 28.9845,
        verified: true,
        fields: 2,
        indoor: true,
        has_lighting: true,
        has_parking: true,
      },
      {
        name: 'Beşiktaş Halısaha',
        address: 'Beşiktaş, İstanbul',
        latitude: 41.0426,
        longitude: 29.0059,
        verified: true,
        fields: 1,
        indoor: false,
        has_lighting: true,
      },
      {
        name: 'Kadıköy Futbol Sahası',
        address: 'Kadıköy, İstanbul',
        latitude: 40.9896,
        longitude: 29.0293,
        verified: true,
        fields: 3,
        indoor: false,
        has_lighting: true,
        has_parking: false,
      },
    ],
    skipDuplicates: true,
  });

  console.log(`✅ ${venues.count} venues added!`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });





