import type { PrismaClient, Role } from '@prisma/client';
import request from 'supertest';
import type { Express } from 'express';
import { hashPassword } from '../../src/auth/password.js';

export const TEST_PASSWORD = 'Correct-horse-42';

/** Empties every table in the dedicated test database (guarded by loadTestEnvironment). */
export async function resetTables(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe('TRUNCATE "Registration", "Session", "Event", "User" RESTART IDENTITY CASCADE');
}

let cachedHash: Promise<string> | undefined;
export async function createUser(prisma: PrismaClient, role: Role, label: string) {
  cachedHash ??= hashPassword(TEST_PASSWORD);
  return prisma.user.create({
    data: { email: `${label}@example.test`, name: label, role, passwordHash: await cachedHash },
  });
}

/** Logs in through the real endpoint. Returns an agent holding the sid cookie, plus the CSRF token. */
export async function loginAs(app: Express, email: string, password = TEST_PASSWORD) {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({ email, password });
  if (response.status !== 200) throw new Error(`login failed for ${email}: ${response.status}`);
  return { agent, csrfToken: response.body.csrfToken as string, response };
}

export function sidCookie(setCookie: string[] | string | undefined) {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return cookies.find((cookie) => cookie.startsWith('sid='));
}
