import * as crypto from 'crypto';

// Basit at-rest şifreleme: AES-256-GCM ile içerik şifrele
// NOT: Anahtar yönetimi için prod ortamında KMS/HSM veya env üzerinden strong key kullanın

const ALGO = 'aes-256-gcm';
const KEY_HEX = process.env.MESSAGE_ENCRYPTION_KEY; // 64 hex chars (32 bytes)

function getKey(): Buffer {
  if (!KEY_HEX) {
    throw new Error('MESSAGE_ENCRYPTION_KEY is not set');
  }
  const key = Buffer.from(KEY_HEX, 'hex');
  if (key.length !== 32) {
    throw new Error('MESSAGE_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
  }
  return key;
}

export function encryptMessageContent(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit nonce
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Saklama formatı: base64( iv || authTag || ciphertext )
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

export function decryptMessageContent(stored: string): string {
  const key = getKey();
  const buf = Buffer.from(stored, 'base64');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28); // 16 bytes
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  return plaintext;
}


