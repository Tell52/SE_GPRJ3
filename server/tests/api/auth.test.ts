import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { loadTestEnvironment } from '../helpers/test-database.js';
import { createUser, loginAs, resetTables, sidCookie, TEST_PASSWORD } from '../helpers/api.js';

// Point the app's Prisma client at the guarded test database before importing it.
const env = loadTestEnvironment() as unknown as { DATABASE_URL: string };
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.NODE_ENV = 'test';
const { createApp } = await import('../../src/app.js');
const { prisma: appPrisma } = await import('../../src/db.js');
const { requireSession, requireRole, requireCsrf } = await import('../../src/middleware/auth.js');
const { notFound, AppError, sendError } = await import('../../src/errors.js');

const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
let app: Express;

// Every Sprint 1 protected route. Issues #4-6 add their endpoints here so T-03 keeps covering them.
const PROTECTED_ROUTES: Array<['get' | 'post', string]> = [
  ['get', '/api/auth/me'],
  ['post', '/api/auth/logout'],
];

const SECRET_FIELDS = ['passwordHash', 'password', 'tokenHash', 'token'];
function expectNoSecrets(body: unknown, rawToken?: string) {
  const text = JSON.stringify(body);
  for (const field of SECRET_FIELDS) expect(text).not.toContain(`"${field}"`);
  if (rawToken) expect(text).not.toContain(rawToken);
}

function rawToken(setCookie: string | undefined) {
  return setCookie ? decodeURIComponent(setCookie.split(';')[0].slice('sid='.length)) : '';
}

beforeAll(async () => {
  await prisma.$connect();
  app = createApp();
});

beforeEach(async () => {
  await resetTables(prisma);
  await createUser(prisma, 'PARTICIPANT', 'p1');
  await createUser(prisma, 'ORGANIZER', 'org1');
});

afterAll(async () => {
  await resetTables(prisma);
  await prisma.$disconnect();
  await appPrisma.$disconnect();
});

describe('T-01 / AC-01: login', () => {
  test('valid credentials return the stored identity, a CSRF token and an HttpOnly SameSite=Lax sid cookie', async () => {
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'p1@example.test' } });
    const response = await request(app).post('/api/auth/login').send({ email: '  P1@Example.TEST ', password: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({ id: stored.id, name: stored.name, email: stored.email, role: 'PARTICIPANT' });
    expect(typeof response.body.csrfToken).toBe('string');
    expect(response.body.csrfToken.length).toBeGreaterThanOrEqual(32);

    const cookie = sidCookie(response.headers['set-cookie']);
    expect(cookie).toBeDefined();
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=28800');
    expect(cookie).not.toContain('Secure');

    const sessions = await prisma.session.findMany({ where: { userId: stored.id } });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].tokenHash).not.toBe(rawToken(cookie));
    expect(sessions[0].revokedAt).toBeNull();
  });

  test('wrong password and unknown email return the identical 401 with no cookie and no session', async () => {
    const wrong = await request(app).post('/api/auth/login').send({ email: 'p1@example.test', password: 'Wrong-password-9' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@example.test', password: TEST_PASSWORD });

    for (const response of [wrong, unknown]) {
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.error.message).toBe('Email or password is incorrect.');
      expect(sidCookie(response.headers['set-cookie'])).toBeUndefined();
    }
    expect(wrong.body).toEqual(unknown.body);
    expect(await prisma.session.count()).toBe(0);
  });

  test('missing or malformed fields return 400 VALIDATION_ERROR with field details', async () => {
    const empty = await request(app).post('/api/auth/login').send({});
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe('VALIDATION_ERROR');
    expect(empty.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual(['email', 'password']);

    const malformed = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: '' });
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual(['email', 'password']);

    const wrongType = await request(app).post('/api/auth/login').send({ email: 42, password: ['x'] });
    expect(wrongType.status).toBe(400);
    expect(await prisma.session.count()).toBe(0);
  });
});

describe('T-02 / AC-02: hashes, secret fields and expiry', () => {
  test('stored hash differs from the password and no response exposes hashes or tokens', async () => {
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'p1@example.test' } });
    expect(stored.passwordHash).not.toBe(TEST_PASSWORD);
    expect(stored.passwordHash.startsWith('$2')).toBe(true);

    const { agent, response } = await loginAs(app, 'p1@example.test');
    const token = rawToken(sidCookie(response.headers['set-cookie']));
    const session = await prisma.session.findFirstOrThrow({ where: { userId: stored.id } });
    expectNoSecrets(response.body, token);
    expect(JSON.stringify(response.body)).not.toContain(session.tokenHash);
    expect(JSON.stringify(response.body)).not.toContain(stored.passwordHash);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expectNoSecrets(me.body, token);
    expect(JSON.stringify(me.body)).not.toContain(session.tokenHash);
  });

  test('a session past its absolute expiry is rejected with 401', async () => {
    const { agent } = await loginAs(app, 'p1@example.test');
    expect((await agent.get('/api/auth/me')).status).toBe(200);
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const expired = await agent.get('/api/auth/me');
    expect(expired.status).toBe(401);
    expect(expired.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('expiry is absolute: using the session does not extend expiresAt', async () => {
    const { agent } = await loginAs(app, 'p1@example.test');
    const before = (await prisma.session.findFirstOrThrow()).expiresAt;
    await agent.get('/api/auth/me');
    await agent.get('/api/auth/me');
    expect((await prisma.session.findFirstOrThrow()).expiresAt).toEqual(before);
    const ttl = before.getTime() - (await prisma.session.findFirstOrThrow()).createdAt.getTime();
    expect(Math.abs(ttl - 8 * 60 * 60 * 1000)).toBeLessThan(5000);
  });
});

describe('T-03 / AC-03: access control and CSRF', () => {
  test.each(PROTECTED_ROUTES)('anonymous %s %s returns 401 with only an error body', async (method, path) => {
    const response = await request(app)[method](path);
    expect(response.status).toBe(401);
    expect(Object.keys(response.body)).toEqual(['error']);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('a forged or unknown sid cookie returns 401', async () => {
    const response = await request(app).get('/api/auth/me').set('Cookie', 'sid=forged-token-value');
    expect(response.status).toBe(401);
  });

  test('requireRole returns 403 for the wrong role and passes the right role', async () => {
    // Organizer only routes arrive in #4; this mounts the shared middleware on a probe route.
    const probe = express();
    probe.use(cookieParser());
    probe.get('/probe/organizer', requireSession, requireRole('ORGANIZER'), (req, res) => res.json({ role: req.user!.role }));
    probe.use((_req, res) => sendError(res, notFound()));
    probe.use(((error, _req, res, _next) => {
      if (error instanceof AppError) return sendError(res, error);
      res.status(500).end();
    }) as express.ErrorRequestHandler);

    const participant = await loginAs(app, 'p1@example.test');
    const organizer = await loginAs(app, 'org1@example.test');
    const cookieOf = (r: { headers: Record<string, unknown> }) => sidCookie(r.headers['set-cookie'] as string[])!.split(';')[0];

    const denied = await request(probe).get('/probe/organizer').set('Cookie', cookieOf(participant.response));
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');
    const allowed = await request(probe).get('/probe/organizer').set('Cookie', cookieOf(organizer.response));
    expect(allowed.status).toBe(200);
    expect(allowed.body.role).toBe('ORGANIZER');
  });

  test('a state changing request without or with a wrong X-CSRF-Token returns 403 and changes nothing', async () => {
    const { agent, csrfToken } = await loginAs(app, 'p1@example.test');

    const missing = await agent.post('/api/auth/logout');
    expect(missing.status).toBe(403);
    expect(missing.body.error.code).toBe('CSRF_INVALID');

    const wrong = await agent.post('/api/auth/logout').set('X-CSRF-Token', `${csrfToken}x`);
    expect(wrong.status).toBe(403);
    expect(wrong.body.error.code).toBe('CSRF_INVALID');

    const other = await loginAs(app, 'org1@example.test');
    const crossSession = await agent.post('/api/auth/logout').set('X-CSRF-Token', other.csrfToken);
    expect(crossSession.status).toBe(403);

    expect(await prisma.session.count({ where: { revokedAt: { not: null } } })).toBe(0);
    expect((await agent.get('/api/auth/me')).status).toBe(200);
  });

  test('requireCsrf lets safe methods through without a token', async () => {
    const { agent } = await loginAs(app, 'p1@example.test');
    expect((await agent.get('/api/auth/me')).status).toBe(200);
    expect(typeof requireCsrf).toBe('function');
  });

  test('role or userId in the login body is ignored; identity comes from the stored account', async () => {
    const organizer = await prisma.user.findUniqueOrThrow({ where: { email: 'org1@example.test' } });
    const response = await request(app).post('/api/auth/login')
      .send({ email: 'p1@example.test', password: TEST_PASSWORD, role: 'ORGANIZER', userId: organizer.id, id: organizer.id });
    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('PARTICIPANT');
    expect(response.body.user.email).toBe('p1@example.test');

    const session = await prisma.session.findFirstOrThrow();
    expect(session.userId).not.toBe(organizer.id);
    expect((await prisma.user.findUniqueOrThrow({ where: { email: 'p1@example.test' } })).role).toBe('PARTICIPANT');
  });
});

describe('T-04 / AC-04: logout', () => {
  test('logout revokes the session, clears the cookie and the replayed old cookie is rejected', async () => {
    const { agent, csrfToken, response } = await loginAs(app, 'p1@example.test');
    const oldCookie = sidCookie(response.headers['set-cookie'])!.split(';')[0];

    const logout = await agent.post('/api/auth/logout').set('X-CSRF-Token', csrfToken);
    expect(logout.status).toBe(200);
    expect(logout.body).toEqual({ ok: true });
    const cleared = sidCookie(logout.headers['set-cookie']);
    expect(cleared).toBeDefined();
    expect(cleared).toMatch(/^sid=;|Expires=Thu, 01 Jan 1970/);

    const session = await prisma.session.findFirstOrThrow();
    expect(session.revokedAt).not.toBeNull();

    expect((await agent.get('/api/auth/me')).status).toBe(401);
    const replay = await request(app).get('/api/auth/me').set('Cookie', oldCookie);
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('logging out one session leaves the user\'s other sessions working', async () => {
    const first = await loginAs(app, 'p1@example.test');
    const second = await loginAs(app, 'p1@example.test');
    await first.agent.post('/api/auth/logout').set('X-CSRF-Token', first.csrfToken);
    expect((await first.agent.get('/api/auth/me')).status).toBe(401);
    expect((await second.agent.get('/api/auth/me')).status).toBe(200);
  });
});
