import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SCRYPT_KEYLEN = 64;
const PREFIX = 'scrypt$';

/**
 * Hash seguro para senha do portal (scrypt + salt).
 * Formato: scrypt$<salt_hex>$<hash_hex>
 */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, SCRYPT_KEYLEN).toString('hex');
  return `${PREFIX}${salt}$${hash}`;
}

export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored || !stored.startsWith(PREFIX)) return false;
  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const salt = parts[1];
  const expectedHex = parts[2];
  try {
    const test = scryptSync(plain, salt, SCRYPT_KEYLEN);
    const expected = Buffer.from(expectedHex, 'hex');
    if (test.length !== expected.length) return false;
    return timingSafeEqual(test, expected);
  } catch {
    return false;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
