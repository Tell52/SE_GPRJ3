import request from 'supertest';
import { PrismaClient, type User } from '@prisma/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { loadTestEnvironment } from '../helpers/test-database.js';
import { createUser, loginAs, resetTables } from '../helpers/api.js';

const env = loadTestEnvironment() as unknown as { DATABASE_URL: string };
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.NODE_ENV = 'test';
const { createApp } = await import('../../src/app.js');
const { prisma: appPrisma } = await import('../../src/db.js');
const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
let app = createApp();

type Login = Awaited<ReturnType<typeof loginAs>>;
let organizer: User;
let participants: User[];
let p1: Login;
let p2: Login;

const DAY = 86400000;
async function createEvent(overrides: { capacity?: number; status?: 'DRAFT' | 'PUBLISHED'; startsInMs?: number; title?: string } = {}) {
  const startsAt = new Date(Date.now() + (overrides.startsInMs ?? DAY));
  return prisma.event.create({ data: {
    organizerId: organizer.id, title: overrides.title ?? 'Intro to Git', location: 'CB2301',
    capacity: overrides.capacity ?? 3, status: overrides.status ?? 'PUBLISHED',
    publishedAt: (overrides.status ?? 'PUBLISHED') === 'PUBLISHED' ? new Date() : null,
    startsAt, endsAt: new Date(startsAt.getTime() + 2 * 3600000),
  } });
}
const register = (login: Login, eventId: number) =>
  login.agent.post(`/api/events/${eventId}/registrations`).set('X-CSRF-Token', login.csrfToken);
const activeCount = (eventId: number) => prisma.registration.count({ where: { eventId, status: 'ACTIVE' } });

beforeAll(async () => {
  await resetTables(prisma);
  organizer = await createUser(prisma, 'ORGANIZER', 'reg-org1');
  await createUser(prisma, 'ORGANIZER', 'reg-org2');
  participants = [];
  for (let i = 1; i <= 12; i += 1) participants.push(await createUser(prisma, 'PARTICIPANT', `reg-p${i}`));
  p1 = await loginAs(app, participants[0].email);
  p2 = await loginAs(app, participants[1].email);
});

beforeEach(async () => {
  await prisma.registration.deleteMany();
  await prisma.event.deleteMany();
});

afterAll(async () => { await resetTables(prisma); await prisma.$disconnect(); await appPrisma.$disconnect(); });

describe('F-05 participant cancellation', () => {
  const cancel = (login: Login, id: number) =>
    login.agent.post(`/api/registrations/${id}/cancel`).set('X-CSRF-Token', login.csrfToken);
  afterEach(() => vi.useRealTimers());

  test('T-20: one cancellation at start minus 1 ms persists across reads and frees one seat', async () => {
    const event = await createEvent({ capacity: 1, startsInMs: 2 * 3600000 });
    const { body: receipt } = await register(p1, event.id).expect(201);
    expect(await activeCount(event.id)).toBe(1);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(event.startsAt.getTime() - 1);
    const results = await Promise.all([cancel(p1, receipt.id), cancel(p1, receipt.id)]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    expect(results.find(r => r.status === 409)!.body.error.code).toBe('INVALID_STATE');
    const saved = await p1.agent.get(`/api/registrations/${receipt.id}`).expect(200);
    expect(saved.body).toEqual(results.find(r => r.status === 200)!.body);
    expect(saved.body).toMatchObject({ status: 'CANCELLED', cancelledBy: 'PARTICIPANT', cancelledAt: new Date().toISOString() });
    expect(await activeCount(event.id)).toBe(0);
    expect((await p1.agent.get(`/api/events/${event.id}`)).body.remainingPlaces).toBe(1);
  });

  test.each([0, 1])('T-21: start plus %i ms rejects without changing the receipt', async (offset) => {
    const event = await createEvent({ startsInMs: 2 * 3600000 });
    const { body: receipt } = await register(p1, event.id).expect(201);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(event.startsAt.getTime() + offset);
    const response = await cancel(p1, receipt.id).expect(409);
    expect(response.body.error.code).toBe('CANCELLATION_CLOSED');
    expect((await p1.agent.get(`/api/registrations/${receipt.id}`)).body).toEqual(receipt);
  });

  test('T-22: rebook with a new ID, then another participant takes the freed seat', async () => {
    const event = await createEvent({ capacity: 1 });
    const { body: first } = await register(p1, event.id).expect(201);
    await cancel(p1, first.id).expect(200);
    const { body: next } = await register(p1, event.id).expect(201);
    expect(next.id).not.toBe(first.id);
    await cancel(p1, next.id).expect(200);
    await cancel(p1, next.id).expect(409);
    expect(await activeCount(event.id)).toBe(0);
    await register(p2, event.id).expect(201);
    expect((await register(p1, event.id).expect(409)).body.error.code).toBe('EVENT_FULL');
    expect(await activeCount(event.id)).toBe(1);
    const history = await p1.agent.get('/api/registrations/mine').expect(200);
    expect(history.body.items.map((r: { id: number; status: string }) => [r.id, r.status]))
      .toEqual([[first.id, 'CANCELLED'], [next.id, 'CANCELLED']]);
    const owner = await loginAs(app, organizer.email);
    const roster = await owner.agent.get(`/api/events/${event.id}/registrations`).expect(200);
    expect(roster.body.count).toBe(1);
  });

  test('T-23: only the authenticated holder with valid CSRF can cancel', async () => {
    const event = await createEvent();
    const { body: receipt } = await register(p1, event.id).expect(201);
    const path = `/api/registrations/${receipt.id}/cancel`;
    await request(app).post(path).expect(401);
    expect((await p1.agent.post(path).expect(403)).body.error.code).toBe('CSRF_INVALID');
    await cancel(await loginAs(app, organizer.email), receipt.id).expect(403);
    await cancel(p1, 2147483647).expect(404);
    expect((await cancel(p2, receipt.id).expect(404)).body.error.code).toBe('NOT_FOUND');
    expect((await p1.agent.get(`/api/registrations/${receipt.id}`)).body).toEqual(receipt);
    expect(await activeCount(event.id)).toBe(1);
  });
});

describe('T-10 / AC-10: successful registration is stored and retrievable', () => {
  test('201 ACTIVE for the session participant, row stored, remainingPlaces drops, same id in a new session', async () => {
    const event = await createEvent({ capacity: 3 });
    const response = await register(p1, event.id).send({ participantId: participants[1].id, status: 'CANCELLED' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ status: 'ACTIVE', event: { id: event.id, title: 'Intro to Git', location: 'CB2301' } });
    const stored = await prisma.registration.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(stored).toMatchObject({ eventId: event.id, participantId: participants[0].id, status: 'ACTIVE' });
    expect(await activeCount(event.id)).toBe(1);

    const detail = await p1.agent.get(`/api/events/${event.id}`);
    expect(detail.body.remainingPlaces).toBe(2);
    expect(detail.body.myRegistration).toEqual({ id: response.body.id, status: 'ACTIVE' });

    const fresh = await loginAs(app, participants[0].email);
    const again = await fresh.agent.get(`/api/registrations/${response.body.id}`);
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(response.body.id);
  });
});

describe('T-11 / AC-11: one active registration per participant per event', () => {
  test('a second attempt returns 409 ALREADY_REGISTERED and the count is unchanged', async () => {
    const event = await createEvent();
    expect((await register(p1, event.id)).status).toBe(201);
    const second = await register(p1, event.id);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ALREADY_REGISTERED');
    expect(await activeCount(event.id)).toBe(1);
  });

  test('five concurrent requests from the same participant store exactly one ACTIVE row', async () => {
    const event = await createEvent({ capacity: 10 });
    const responses = await Promise.all(Array.from({ length: 5 }, () => register(p1, event.id)));
    const statuses = responses.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409]);
    for (const r of responses.filter((x) => x.status === 409)) expect(r.body.error.code).toBe('ALREADY_REGISTERED');
    expect(await prisma.registration.count({ where: { eventId: event.id, participantId: participants[0].id, status: 'ACTIVE' } })).toBe(1);
  });
});

describe('T-13 / AC-13: competing requests for the last place', () => {
  test('capacity 1 and ten participants at once: exactly one 201, nine 409 EVENT_FULL, one ACTIVE row', async () => {
    const event = await createEvent({ capacity: 1 });
    const logins = await Promise.all(participants.slice(2, 12).map((p) => loginAs(app, p.email)));
    const responses = await Promise.all(logins.map((login) => register(login, event.id)));

    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    const rejected = responses.filter((r) => r.status === 409);
    expect(rejected).toHaveLength(9);
    for (const r of rejected) expect(r.body.error.code).toBe('EVENT_FULL');
    expect(await activeCount(event.id)).toBe(1);
  });
});

describe('T-14 / AC-14: closed, missing, draft and organizer registrations are rejected', () => {
  test('draft 404, missing 404, started 409 REGISTRATION_CLOSED, organizer 403; no rows inserted', async () => {
    const draft = await createEvent({ status: 'DRAFT' });
    const started = await createEvent({ startsInMs: DAY });
    await prisma.event.update({ where: { id: started.id }, data: { startsAt: new Date(Date.now() - 60000) } });
    const open = await createEvent();
    const organizer2 = await loginAs(app, 'reg-org2@example.test');

    const toDraft = await register(p1, draft.id);
    const toMissing = await register(p1, 999999);
    const toStarted = await register(p1, started.id);
    const asOrganizer = await register(organizer2, open.id);
    const badId = await register(p1, 0);

    expect(toDraft.status).toBe(404);
    expect(toMissing.status).toBe(404);
    expect(toStarted.status).toBe(409);
    expect(toStarted.body.error.code).toBe('REGISTRATION_CLOSED');
    expect(asOrganizer.status).toBe(403);
    expect(badId.status).toBe(404);
    expect(await prisma.registration.count()).toBe(0);
  });

  test('registration endpoints require a session, the participant role and a CSRF token', async () => {
    const event = await createEvent();
    expect((await request(app).post(`/api/events/${event.id}/registrations`)).status).toBe(401);
    expect((await request(app).get('/api/registrations/mine')).status).toBe(401);
    expect((await request(app).get('/api/registrations/1')).status).toBe(401);
    const noCsrf = await p1.agent.post(`/api/events/${event.id}/registrations`);
    expect(noCsrf.status).toBe(403);
    expect(noCsrf.body.error.code).toBe('CSRF_INVALID');
    const organizerLogin = await loginAs(app, organizer.email);
    expect((await organizerLogin.agent.get('/api/registrations/mine')).status).toBe(403);
    expect(await prisma.registration.count()).toBe(0);
  });
});

describe('T-15 / AC-15: personal registrations are private and durable', () => {
  test('mine lists only own registrations with event details; another participant gets 404; survives an app restart', async () => {
    const e1 = await createEvent({ title: 'Event One' });
    const e2 = await createEvent({ title: 'Event Two', startsInMs: 2 * DAY });
    const mineReg = (await register(p1, e1.id)).body;
    const theirsReg = (await register(p2, e2.id)).body;

    const mine = await p1.agent.get('/api/registrations/mine');
    expect(mine.status).toBe(200);
    expect(mine.body.items).toHaveLength(1);
    expect(mine.body.items[0]).toMatchObject({ id: mineReg.id, status: 'ACTIVE', event: { id: e1.id, title: 'Event One', location: 'CB2301' } });
    expect(mine.body.items[0].event.startsAt).toBeDefined();
    expect(JSON.stringify(mine.body)).not.toContain('"participantId"');
    expect(JSON.stringify(mine.body)).not.toContain('"email"');

    const peek = await p2.agent.get(`/api/registrations/${mineReg.id}`);
    expect(peek.status).toBe(404);
    expect(Object.keys(peek.body)).toEqual(['error']);
    const theirs = await p2.agent.get('/api/registrations/mine');
    expect(theirs.body.items.map((r: { id: number }) => r.id)).toEqual([theirsReg.id]);

    // Restart: drop the app's database connection and build a new app instance on the same database.
    await appPrisma.$disconnect();
    app = createApp();
    const relogin = await loginAs(app, participants[0].email);
    const afterRestart = await relogin.agent.get(`/api/registrations/${mineReg.id}`);
    expect(afterRestart.status).toBe(200);
    expect(afterRestart.body).toMatchObject({ id: mineReg.id, status: 'ACTIVE', event: { id: e1.id } });
  });
});

describe('T-14b / AC-14, #49: registration closes 60 minutes before start (server clock)', () => {
  const MIN = 60000;
  // Only Date is faked, so the server's `new Date()` is fixed while the database and HTTP keep running normally.
  afterEach(() => vi.useRealTimers());
  const freezeAt = (time: Date) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(time); };
  const eventStartingAt = (startsAt: Date) => prisma.event.create({ data: {
    organizerId: organizer.id, title: 'Cutoff workshop', location: 'CB2301', capacity: 3, status: 'PUBLISHED',
    publishedAt: new Date(), startsAt, endsAt: new Date(startsAt.getTime() + 2 * 3600000),
  } });

  test('start - 60 min - 1 s is accepted with 201; exactly start - 60 min, start - 30 min and start get 409 with no row', async () => {
    const now = new Date(Date.now());
    const open = await eventStartingAt(new Date(now.getTime() + 60 * MIN + 1000));
    const atCutoff = await eventStartingAt(new Date(now.getTime() + 60 * MIN));
    const halfHour = await eventStartingAt(new Date(now.getTime() + 30 * MIN));
    const atStart = await eventStartingAt(now);
    freezeAt(now);

    const accepted = await register(p1, open.id);
    expect(accepted.status).toBe(201);
    expect(accepted.body.status).toBe('ACTIVE');

    for (const closed of [atCutoff, halfHour, atStart]) {
      const response = await register(p1, closed.id);
      expect(response.status).toBe(409);
      expect(response.body.error).toMatchObject({ code: 'REGISTRATION_CLOSED', message: 'Registration for this event is closed.' });
      expect(await activeCount(closed.id)).toBe(0);
    }
  });

  test('after the cutoff an organizer still gets 403 and an already registered participant gets REGISTRATION_CLOSED, keeping one ACTIVE registration', async () => {
    const now = new Date(Date.now());
    const event = await eventStartingAt(new Date(now.getTime() + 2 * 3600000));
    const organizer2 = await loginAs(app, 'reg-org2@example.test');
    expect((await register(p2, event.id)).status).toBe(201);

    freezeAt(new Date(event.startsAt.getTime() - 60 * MIN));
    const again = await register(p2, event.id);
    const asOrganizer = await register(organizer2, event.id);

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('REGISTRATION_CLOSED');
    expect(asOrganizer.status).toBe(403);
    expect(await activeCount(event.id)).toBe(1);
  });
});
