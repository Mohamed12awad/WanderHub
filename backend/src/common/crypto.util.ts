import * as crypto from 'crypto';

// AES-256-GCM symmetric encryption for secrets at rest (SMTP password, AI keys).
// Key material is derived from JWT_SECRET. Output format:
//   iv(12B) + authTag(16B) + ciphertext, base64-encoded as a single string.
const ALGO = 'aes-256-gcm';

function deriveKey(): Buffer {
  const secret = process.env.JWT_SECRET ?? 'fallback-secret-change-me';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const key = deriveKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc) + decipher.final('utf8');
}
