import bcrypt from 'bcrypt';

export const BCRYPT_COST = 12;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

// Compared against when the email is unknown, so both failure paths do the same bcrypt work.
let dummyHash: Promise<string> | undefined;
export function dummyPasswordHash() {
  dummyHash ??= bcrypt.hash('dummy-password-for-timing', BCRYPT_COST);
  return dummyHash;
}
