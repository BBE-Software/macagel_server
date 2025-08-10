/*
  Re-encrypt existing plaintext messages.
  Logic: try to decrypt; if fails, treat as plaintext and encrypt.
*/
import { PrismaClient } from '@prisma/client';
import { decryptMessageContent, encryptMessageContent } from '../src/utils/crypto.util';

const prisma = new PrismaClient();

async function run() {
  const batchSize = 500;
  let total = 0;
  let updated = 0;
  let cursor: string | null = null;

  while (true) {
    const messages = await prisma.message.findMany({
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    });
    if (messages.length === 0) break;

    for (const msg of messages) {
      total++;
      const content = msg.content;
      let isEncrypted = true;
      try {
        // if decrypt works, we assume already encrypted
        decryptMessageContent(content);
      } catch {
        isEncrypted = false;
      }
      if (!isEncrypted) {
        const newContent = encryptMessageContent(content);
        await prisma.message.update({
          where: { id: msg.id },
          data: { content: newContent },
        });
        updated++;
      }
    }

    cursor = messages[messages.length - 1].id;
    console.log(`Processed: ${total}, updated: ${updated}`);
  }

  console.log('Done. Total:', total, 'Updated:', updated);
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});


