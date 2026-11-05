import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { beforeAll, afterAll, expect, test } from 'vitest';
import { createApp } from '../../src/app.js';
import { loadTestEnvironment } from '../helpers/test-database.js';

const require = createRequire(import.meta.url);
const env = loadTestEnvironment();
const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
const children = new Set<ChildProcess>();
const run = (file: string, args: string[]) => execFileSync(process.execPath, [file, ...args], {
  env, cwd: process.cwd(), encoding: 'utf8', timeout: 60000, stdio: 'pipe',
});
const migrate = (...args: string[]) => run(require.resolve('prisma/build/index.js'), args);
const seed = () => run(require.resolve('tsx/cli'), ['prisma/seed.ts']);

async function snapshot() {
  return {
    users: await prisma.user.findMany({ orderBy: { id: 'asc' } }),
    sessions: await prisma.session.findMany({ orderBy: { id: 'asc' } }),
    events: await prisma.event.findMany({ orderBy: { id: 'asc' } }),
    registrations: await prisma.registration.findMany({ orderBy: { id: 'asc' } }),
  };
}

async function startServer() {
  const child = spawn(process.execPath, ['dist/src/index.js'], { env: { ...env, PORT: '0' }, stdio: 'pipe' });
  children.add(child);
  const origin = await new Promise<string>((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('API did not start in 15 seconds.')), 15000);
    child.once('error', () => { clearTimeout(timer); reject(new Error('API process failed to start.')); });
    child.once('exit', () => { clearTimeout(timer); reject(new Error('API exited before readiness.')); });
    child.stdout!.on('data', (chunk: Buffer) => {
      output += chunk.toString();
      const match = /API listening on (http:\/\/127\.0\.0\.1:\d+)/.exec(output);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
  expect((await fetch(`${origin}/api/not-implemented`)).status).toBe(404);
  return child;
}

async function stopServer(child: ChildProcess) {
  if (child.exitCode === null && child.signalCode === null) {
    const closed = once(child, 'close');
    child.kill();
    await closed;
  }
  children.delete(child);
}

beforeAll(async () => {
  // Guard runs during configuration, before this destructive command is reachable.
  migrate('migrate', 'reset', '--force', '--skip-seed', '--skip-generate');
  await prisma.$connect();
});

afterAll(async () => {
  for (const child of children) await stopServer(child);
  await prisma.$disconnect();
});

test('T-19: fresh migration, repeat seed, changed passwords and edited events survive', async () => {
  expect(await prisma.user.count()).toBe(0);
  expect(await prisma.event.count()).toBe(0);
  migrate('migrate', 'deploy');
  seed();
  expect(await prisma.user.count({ where: { role: 'ORGANIZER' } })).toBe(2);
  expect(await prisma.user.count({ where: { role: 'PARTICIPANT' } })).toBe(3);
  expect(await prisma.event.count({ where: { status: 'DRAFT' } })).toBe(1);
  expect(await prisma.event.count({ where: { status: 'PUBLISHED' } })).toBe(1);
  const users = await prisma.user.findMany();
  for (const user of users) {
    expect(user.passwordHash).not.toBe(env.SEED_PASSWORD);
    expect(bcrypt.getRounds(user.passwordHash)).toBe(12);
    expect(await bcrypt.compare(env.SEED_PASSWORD!, user.passwordHash)).toBe(true);
  }
  const passwordHash = await bcrypt.hash('Changed-only-in-test-19', 12);
  await prisma.user.update({ where: { email: 'participant1@example.test' }, data: { passwordHash } });
  await prisma.event.update({ where: { seedKey: 'demo-draft' }, data: { title: 'Edited by the organizer', capacity: 12 } });
  const before = await snapshot();
  seed();
  expect(await snapshot()).toEqual(before);
  const participant = await prisma.user.findUniqueOrThrow({ where: { email: 'participant1@example.test' } });
  expect(await bcrypt.compare('Changed-only-in-test-19', participant.passwordHash)).toBe(true);
  expect(await bcrypt.compare(env.SEED_PASSWORD!, participant.passwordHash)).toBe(false);
});

test('T-19: raw SQL enforces capacity and end-after-start constraints', async () => {
  const event = await prisma.event.findUniqueOrThrow({ where: { seedKey: 'demo-published' } });
  for (const capacity of [0, -1, 1001]) {
    await expect(prisma.$executeRaw`
      INSERT INTO "Event" ("organizerId", title, location, "startsAt", "endsAt", capacity, "updatedAt")
      VALUES (${event.organizerId}, 'Invalid capacity', 'Test Room', ${event.startsAt}, ${event.endsAt}, ${capacity}, NOW())
    `).rejects.toMatchObject({ code: 'P2010', meta: { code: '23514' } });
  }
  for (const endsAt of [event.startsAt, new Date(event.startsAt.getTime() - 1)]) {
    await expect(prisma.$executeRaw`
      INSERT INTO "Event" ("organizerId", title, location, "startsAt", "endsAt", capacity, "updatedAt")
      VALUES (${event.organizerId}, 'Invalid time', 'Test Room', ${event.startsAt}, ${endsAt}, 1, NOW())
    `).rejects.toMatchObject({ code: 'P2010', meta: { code: '23514' } });
  }
  expect(await prisma.event.count()).toBe(2);
  for (const capacity of [1, 1000]) {
    const valid = await prisma.event.create({ data: {
      organizerId: event.organizerId, title: 'Boundary', location: 'Test Room',
      startsAt: event.startsAt, endsAt: event.endsAt, capacity,
    } });
    expect(valid.capacity).toBe(capacity);
    await prisma.event.delete({ where: { id: valid.id } });
  }
});

test('T-19: unique email, session token, all foreign keys and partial ACTIVE uniqueness are enforced', async () => {
  const participant = await prisma.user.findUniqueOrThrow({ where: { email: 'participant1@example.test' } });
  const event = await prisma.event.findUniqueOrThrow({ where: { seedKey: 'demo-published' } });
  await expect(prisma.user.create({ data: {
    email: participant.email, name: 'Duplicate', passwordHash: 'test', role: 'PARTICIPANT',
  } })).rejects.toMatchObject({ code: 'P2002' });
  const session = { tokenHash: 'a'.repeat(64), csrfToken: 'synthetic-test-csrf', expiresAt: new Date(Date.now() + 3600000) };
  await expect(prisma.session.create({ data: { ...session, userId: 2147483647 } })).rejects.toMatchObject({ code: 'P2003' });
  await prisma.session.create({ data: { ...session, userId: participant.id } });
  await expect(prisma.session.create({ data: { ...session, userId: participant.id } })).rejects.toMatchObject({ code: 'P2002' });
  await expect(prisma.event.create({ data: {
    organizerId: 2147483647, title: 'Invalid owner', location: 'Test Room', capacity: 1,
    startsAt: event.startsAt, endsAt: event.endsAt,
  } })).rejects.toMatchObject({ code: 'P2003' });
  await expect(prisma.registration.create({ data: { eventId: 2147483647, participantId: participant.id } })).rejects.toMatchObject({ code: 'P2003' });
  await expect(prisma.registration.create({ data: { eventId: event.id, participantId: 2147483647 } })).rejects.toMatchObject({ code: 'P2003' });
  await prisma.registration.create({ data: { eventId: event.id, participantId: participant.id } });
  await expect(prisma.$executeRaw`
    INSERT INTO "Registration" ("eventId", "participantId", status)
    VALUES (${event.id}, ${participant.id}, 'ACTIVE')
  `).rejects.toMatchObject({ code: 'P2010', meta: { code: '23505' } });
  expect(await prisma.registration.count()).toBe(1);
  const indexes = await prisma.$queryRaw<{ indexdef: string }[]>`
    SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'registration_one_active'
  `;
  expect(indexes).toHaveLength(1);
  expect(indexes[0].indexdef).toContain('UNIQUE INDEX');
  expect(indexes[0].indexdef).toContain('WHERE');
  expect(indexes[0].indexdef).toContain('ACTIVE');
});

test('T-19: two real API process starts preserve every existing row', async () => {
  const before = await snapshot();
  expect(before.registrations).toHaveLength(1);
  expect(before.sessions).toHaveLength(1);
  for (let iteration = 0; iteration < 2; iteration++) {
    const child = await startServer();
    expect(await snapshot()).toEqual(before);
    await stopServer(child);
    expect(await snapshot()).toEqual(before);
  }
});

test('API foundation returns safe JSON for unknown routes and malformed input', async () => {
  const response = await request(createApp()).get('/api/unknown');
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Resource not found.', details: [] } });
  const invalid = await request(createApp()).post('/api/unknown').set('Content-Type', 'application/json').send('{');
  expect(invalid.status).toBe(400);
  expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  expect(invalid.body).not.toHaveProperty('stack');
});
