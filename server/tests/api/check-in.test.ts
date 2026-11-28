import request from 'supertest';
import { PrismaClient, type User } from '@prisma/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { loadTestEnvironment } from '../helpers/test-database.js';
import { createUser, loginAs, resetTables } from '../helpers/api.js';

// F-09 on-site check-in (Sprint 3): T-37 to T-39 in docs/sprints/sprint-3/contracts.md.
const env = loadTestEnvironment() as unknown as { DATABASE_URL: string };
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.NODE_ENV = 'test';
const { createApp } = await import('../../src/app.js');
const { prisma: appPrisma } = await import('../../src/db.js');
const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
const app = createApp();

type Login = Awaited<ReturnType<typeof loginAs>>;
let owner: User; let participant: User;
let o: Login; let q: Login; let p: Login;

const HOUR = 3600000;
/** Published event starting in 30 min and ending 2 h later, so every frozen time stays inside the 8 h session. */
async function eventWithRegistration({ status = 'ACTIVE' as 'ACTIVE' | 'CANCELLED', eventStatus = 'PUBLISHED' as 'PUBLISHED' | 'CANCELLED' } = {}) {
  const startsAt = new Date(Date.now() + HOUR / 2);
  const event = await prisma.event.create({ data: {
    organizerId: owner.id, title: 'Check-in workshop', location: 'CB2301', capacity: 5, status: eventStatus,
    publishedAt: new Date(), startsAt, endsAt: new Date(startsAt.getTime() + 2 * HOUR),
  } });
  const registration = await prisma.registration.create({ data: {
    eventId: event.id, participantId: participant.id, status,
    ...(status === 'CANCELLED' && { cancelledAt: new Date(), cancelledBy: eventStatus === 'CANCELLED' ? 'ORGANIZER' : 'PARTICIPANT' }),
  } });
  return { event, registration };
}
const checkIn = (login: Login, id: number) => login.agent.post(`/api/registrations/${id}/check-in`).set('X-CSRF-Token', login.csrfToken);
const storedCheckIn = async (id: number) => (await prisma.registration.findUniqueOrThrow({ where: { id } })).checkedInAt ?? null;
// Only Date is faked, so the server's `new Date()` is fixed while PostgreSQL and HTTP run normally.
const freezeAt = (time: Date) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(time); };

beforeAll(async () => {
  await resetTables(prisma);
  owner = await createUser(prisma, 'ORGANIZER', 'chk-o');
  await createUser(prisma, 'ORGANIZER', 'chk-q');
  participant = await createUser(prisma, 'PARTICIPANT', 'chk-p');
  o = await loginAs(app, 'chk-o@example.test');
  q = await loginAs(app, 'chk-q@example.test');
  p = await loginAs(app, 'chk-p@example.test');
});
beforeEach(async () => { await prisma.registration.deleteMany(); await prisma.event.deleteMany(); });
afterEach(() => vi.useRealTimers());
afterAll(async () => { await prisma.$disconnect(); await appPrisma.$disconnect(); });

describe('T-37 / AC-37: check-in window [start - 1 h, end)', () => {
  test.each([
    ['start - 1 h - 1 ms', (s: Date, _e: Date) => s.getTime() - HOUR - 1, 409],
    ['exactly start - 1 h', (s: Date, _e: Date) => s.getTime() - HOUR, 200],
    ['end - 1 ms', (_s: Date, e: Date) => e.getTime() - 1, 200],
    ['exactly at end', (_s: Date, e: Date) => e.getTime(), 409],
  ])('%s gives %s', async (_label, at, expected) => {
    const { event, registration } = await eventWithRegistration();
    const now = new Date(at(event.startsAt, event.endsAt));
    freezeAt(now);
    const response = await checkIn(o, registration.id);
    expect(response.status).toBe(expected);
    if (expected === 200) {
      expect(response.body).toMatchObject({ id: registration.id, status: 'ACTIVE', checkedInAt: now.toISOString() });
      expect((await storedCheckIn(registration.id))?.getTime()).toBe(now.getTime());
      const roster = await o.agent.get(`/api/events/${event.id}/registrations`);
      expect(roster.body.items).toMatchObject([{ id: registration.id, checkedInAt: now.toISOString() }]);
    } else {
      expect(response.body.error.code).toBe('CHECK_IN_CLOSED');
      expect(await storedCheckIn(registration.id)).toBeNull();
    }
  });
});

describe('T-38 / AC-38: at most once, ACTIVE registrations only', () => {
  test('two concurrent check-ins: exactly one 200 and one 409 ALREADY_CHECKED_IN, one timestamp', async () => {
    const { event, registration } = await eventWithRegistration();
    freezeAt(new Date(event.startsAt.getTime() + 60000));
    const results = await Promise.all([checkIn(o, registration.id), checkIn(o, registration.id)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(results.find((r) => r.status === 409)!.body.error.code).toBe('ALREADY_CHECKED_IN');
    const saved = results.find((r) => r.status === 200)!.body.checkedInAt;
    expect((await storedCheckIn(registration.id))?.toISOString()).toBe(saved);
  });

  test.each([
    ['a participant-cancelled receipt', { status: 'CANCELLED' as const }],
    ['a receipt on an organizer-cancelled event', { status: 'CANCELLED' as const, eventStatus: 'CANCELLED' as const }],
  ])('%s gets 409 INVALID_STATE and no timestamp', async (_label, setup) => {
    const { event, registration } = await eventWithRegistration(setup);
    freezeAt(new Date(event.startsAt.getTime() + 60000));
    const response = await checkIn(o, registration.id);
    expect([response.status, response.body.error.code]).toEqual([409, 'INVALID_STATE']);
    expect(await storedCheckIn(registration.id)).toBeNull();
  });
});

describe('T-39 / AC-39: only the owning organizer can check in', () => {
  test('other organizer 404, participant 403, anonymous 401, owner without CSRF 403; nothing written', async () => {
    const { event, registration } = await eventWithRegistration();
    freezeAt(new Date(event.startsAt.getTime() + 60000));
    expect((await checkIn(q, registration.id)).status).toBe(404);
    const asParticipant = await checkIn(p, registration.id);
    expect([asParticipant.status, asParticipant.body.error.code]).toEqual([403, 'FORBIDDEN']);
    expect((await request(app).post(`/api/registrations/${registration.id}/check-in`)).status).toBe(401);
    const noCsrf = await o.agent.post(`/api/registrations/${registration.id}/check-in`);
    expect([noCsrf.status, noCsrf.body.error.code]).toEqual([403, 'CSRF_INVALID']);
    expect((await checkIn(o, 999999)).status).toBe(404);
    expect(await storedCheckIn(registration.id)).toBeNull();
  });
});
