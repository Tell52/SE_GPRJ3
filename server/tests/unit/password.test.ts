import bcrypt from 'bcrypt';
import { describe, expect, test } from 'vitest';
import { BCRYPT_COST, hashPassword, verifyPassword } from '../../src/auth/password.js';
import { hashToken, tokensEqual } from '../../src/auth/session.js';

describe('T-02 (unit): password hashing', () => {
  test('hash is bcrypt cost 12, differs from plaintext and verifies only the right password', async () => {
    const plain = 'Unit-test-password-1';
    const hash = await hashPassword(plain);
    expect(hash.startsWith('$2')).toBe(true);
    expect(hash).not.toBe(plain);
    expect(hash).not.toContain(plain);
    expect(bcrypt.getRounds(hash)).toBe(BCRYPT_COST);
    expect(BCRYPT_COST).toBeGreaterThanOrEqual(12);
    expect(await verifyPassword(plain, hash)).toBe(true);
    expect(await verifyPassword('Wrong-password-1', hash)).toBe(false);
  });

  test('two hashes of the same password differ (salted)', async () => {
    expect(await hashPassword('Same-password')).not.toBe(await hashPassword('Same-password'));
  });
});

describe('session token helpers', () => {
  test('token hash is SHA-256 hex and never equals the raw token', () => {
    const hash = hashToken('raw-token');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe('raw-token');
    expect(hashToken('raw-token')).toBe(hash);
  });

  test('token comparison is exact', () => {
    expect(tokensEqual('abc', 'abc')).toBe(true);
    expect(tokensEqual('abc', 'abd')).toBe(false);
    expect(tokensEqual('abc', 'abcd')).toBe(false);
  });
});
