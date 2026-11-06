import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Role } from '@prisma/client';
import { prisma } from '../db.js';

export const SESSION_COOKIE = 'sid';

export type SessionUser = { id: number; name: string; email: string; role: Role };
export type ActiveSession = { id: string; csrfToken: string; user: SessionUser };

export const publicUserSelect = { id: true, name: true, email: true, role: true } as const;

export function sessionTtlMs() {
  const hours = Number(process.env.SESSION_TTL_HOURS ?? 8);
  return (Number.isFinite(hours) && hours > 0 ? hours : 8) * 60 * 60 * 1000;
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function tokensEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Creates a server side session. Only the token's hash is stored; the raw token goes in the cookie. */
export async function createSession(userId: number) {
  const token = randomBytes(32).toString('base64url');
  const csrfToken = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionTtlMs());
  await prisma.session.create({ data: { tokenHash: hashToken(token), csrfToken, userId, expiresAt } });
  return { token, csrfToken, expiresAt };
}

/** Returns the session only if it exists, is not revoked and has not passed its absolute expiry. */
export async function findActiveSession(token: string): Promise<ActiveSession | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, csrfToken: true, expiresAt: true, revokedAt: true, user: { select: publicUserSelect } },
  });
  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return null;
  return { id: session.id, csrfToken: session.csrfToken, user: session.user };
}

export async function revokeSession(id: string) {
  await prisma.session.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
}
