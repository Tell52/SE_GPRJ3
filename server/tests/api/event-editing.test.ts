import request from 'supertest';
import { PrismaClient, type User } from '@prisma/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { loadTestEnvironment } from '../helpers/test-database.js';
import { createUser, loginAs, resetTables } from '../helpers/api.js';

// F-07 event editing and capacity (#52): T-28 to T-32 in docs/sprints/sprint-2/tests.md.
const env = loadTestEnvironment() as unknown as { DATABASE_URL: string };
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.NODE_ENV = 'test';
const { createApp } = await import('../../src/app.js');
const { prisma: appPrisma } = await import('../../src/db.js');
const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
const app = createApp();

type Login = Awaited<ReturnType<typeof loginAs>>;
let owner: User;
let participants: User[];
let o: Login; let q: Login; let p: Login; let r: Login;

const DAY = 86400000;
async function createEvent({ capacity = 4, status = 'PUBLISHED', startsInMs = DAY }: { capacity?: number; status?: 'DRAFT' | 'PUBLISHED'; startsInMs?: number } = {}) {
  const startsAt = new Date(Date.now() + startsInMs);
  return prisma.event.create({ data: {
    organizerId: owner.id, title: 'Intro to Git', location: 'CB2301', description: 'Branches and merges',
    capacity, status, publishedAt: status === 'PUBLISHED' ? new Date() : null,
    startsAt, endsAt: new Date(startsAt.getTime() + 2 * 3600000),
  } });
}
const edit = (login: Login, id: number, body: unknown) =>
  login.agent.patch(`/api/events/${id}`).set('X-CSRF-Token', login.csrfToken).send(body as object);
const stored = (id: number) => prisma.event.findUniqueOrThrow({ where: { id } });
const activeCount = (eventId: number) => prisma.registration.count({ where: { eventId, status: 'ACTIVE' } });
async function activeRows(eventId: number, n: number) {
  for (const participant of participants.slice(0, n)) {
    await prisma.registration.create({ data: { eventId, participantId: participant.id } });
  }
}
// Only Date is faked, so the server's `new Date()` is fixed while PostgreSQL and HTTP run normally.
const freezeAt = (time: Date) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(time); };

beforeAll(async () => {
  await resetTables(prisma);
  owner = await createUser(prisma, 'ORGANIZER', 'edit-o');
  await createUser(prisma, 'ORGANIZER', 'edit-q');
  participants = [];
  for (const label of ['edit-p', 'edit-r', 'edit-s', 'edit-t']) participants.push(await createUser(prisma, 'PARTICIPANT', label));
  o = await loginAs(app, 'edit-o@example.test');
  q = await loginAs(app, 'edit-q@example.test');
  p = await loginAs(app, 'edit-p@example.test');
  r = await loginAs(app, 'edit-r@example.test');
});
beforeEach(async () => { await prisma.registration.deleteMany(); await prisma.event.deleteMany(); });
afterEach(() => vi.useRealTimers());
afterAll(async () => { await prisma.$disconnect(); await appPrisma.$disconnect(); });

test.each([null, 0, 120])('T-26/T-27: direct booking boundary and existing receipt (deadline %s min before start)', async minutes => {
  // Stay within the lifetime of the sessions created in beforeAll.
  const event = await createEvent({ startsInMs: 3 * 3600000 });
  const start = event.startsAt.getTime();
  const deadline = minutes === null ? null : new Date(start - minutes * 60000).toISOString();
  const cutoff = start - (minutes === 120 ? 120 : 60) * 60000;
  const saved = await edit(o, event.id, { registrationDeadline: deadline }).expect(200);
  expect(saved.body.effectiveCutoff).toBe(new Date(cutoff).toISOString());
  const book = (login: Login) => login.agent.post(`/api/events/${event.id}/registrations`).set('X-CSRF-Token', login.csrfToken);
  freezeAt(new Date(cutoff - 1));
  const receipt = await book(r).expect(201);
  for (const offset of [0, 1]) {
    vi.setSystemTime(cutoff + offset);
    const rejected = await book(p).expect(409);
    expect(rejected.body.error).toMatchObject({ code: 'REGISTRATION_CLOSED', message: 'Registration for this event is closed.' });
    expect(await prisma.registration.count({ where: { eventId: event.id } })).toBe(1);
    const detail = await p.agent.get(`/api/events/${event.id}`).expect(200);
    expect(detail.body).toMatchObject({ serverTime: new Date(cutoff + offset).toISOString(), remainingPlaces: 3 });
  }
  expect((await p.agent.get('/api/events')).body.items).toEqual(expect.arrayContaining([expect.objectContaining({ id: event.id })]));
  expect((await r.agent.get(`/api/registrations/${receipt.body.id}`)).body.status).toBe('ACTIVE');
});

test('T-24: owner sets, updates, preserves and clears the stored deadline', async () => {
  const event = await createEvent();
  const early = new Date(event.startsAt.getTime() - 2 * 3600000).toISOString();
  const start = event.startsAt.toISOString();
  const cases = [
    [{ registrationDeadline: early }, early],
    [{ registrationDeadline: start }, start],
    [{ title: 'Workshop' }, start],
    [{ registrationDeadline: null }, null],
  ] as const;
  for (const [patch, expected] of cases) {
    await edit(o, event.id, patch).expect(200);
    expect((await o.agent.get(`/api/events/${event.id}`).expect(200)).body).toMatchObject({
      registrationDeadline: expected,
      effectiveCutoff: expected === early ? early : new Date(event.startsAt.getTime() - 3600000).toISOString(),
    });
  }
});

test('T-25: validate the resulting schedule and protect deadline edits', async () => {
  const event = await createEvent();
  const deadline = event.startsAt.toISOString();
  await edit(o, event.id, { registrationDeadline: deadline }).expect(200);
  for (const patch of [{ registrationDeadline: 'invalid' },
    { registrationDeadline: new Date(event.startsAt.getTime() + 1).toISOString() },
    { startsAt: new Date(event.startsAt.getTime() - 1).toISOString() }]) {
    const res = await edit(o, event.id, patch).expect(400);
    expect(res.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'registrationDeadline' })]));
  }
  await edit(q, event.id, { registrationDeadline: null }).expect(404);
  await request(app).patch(`/api/events/${event.id}`).send({ registrationDeadline: null }).expect(401);
  await o.agent.patch(`/api/events/${event.id}`).send({ registrationDeadline: null }).expect(403);
  await edit(p, event.id, { registrationDeadline: null }).expect(403);
  expect(await stored(event.id)).toMatchObject({ registrationDeadline: event.startsAt, startsAt: event.startsAt });
});

describe('T-28 / AC-28: persist valid edits atomically', () => {
  test.each(['DRAFT', 'PUBLISHED'] as const)('%s event: title and location saved, survive a reload, status unchanged', async (status) => {
    const event = await createEvent({ status });
    const response = await edit(o, event.id, { title: 'Workshop', location: 'CB2312' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: event.id, title: 'Workshop', location: 'CB2312', status, capacity: 4 });
    const reloaded = await o.agent.get(`/api/events/${event.id}`);
    expect(reloaded.body).toMatchObject({ title: 'Workshop', location: 'CB2312', status, description: 'Branches and merges' });
  });

  test('each invalid edit gets 400 VALIDATION_ERROR and saves no field, including the valid ones beside it', async () => {
    const event = await createEvent();
    const before = await stored(event.id);
    const past = new Date(Date.now() - DAY).toISOString();
    const cases: [object, string][] = [
      [{ title: 'X', location: 'CB2312' }, 'title'],
      [{ location: '   ', title: 'Workshop' }, 'location'],
      [{ description: 'a'.repeat(2001) }, 'description'],
      [{ startsAt: past }, 'startsAt'],
      [{ endsAt: before.startsAt.toISOString() }, 'endsAt'],
      [{ capacity: 5, organizerId: 99 }, 'body'],
      [{}, 'body'],
    ];
    for (const [body, field] of cases) {
      const response = await edit(o, event.id, body);
      expect(response.status, JSON.stringify(body).slice(0, 60)).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
    }
    expect(await stored(event.id)).toEqual(before);
  });
});

describe('T-29 / AC-29: capacity limits and active seats', () => {
  test('empty event: 1 and 1000 accepted; 0, 1001 and 1.5 rejected with 400', async () => {
    const event = await createEvent();
    expect((await edit(o, event.id, { capacity: 1 })).body.capacity).toBe(1);
    expect((await edit(o, event.id, { capacity: 1000 })).body.capacity).toBe(1000);
    for (const capacity of [0, 1001, 1.5]) {
      const response = await edit(o, event.id, { capacity });
      expect(response.status).toBe(400);
      expect(response.body.error.details[0].field).toBe('capacity');
    }
    expect((await stored(event.id)).capacity).toBe(1000);
  });

  test('capacity 4 with three ACTIVE: reduce to 3 succeeds, to 2 gets 409 CAPACITY_BELOW_ACTIVE; all three rows remain', async () => {
    const event = await createEvent({ capacity: 4 });
    await activeRows(event.id, 3);
    const toThree = await edit(o, event.id, { capacity: 3 });
    expect(toThree.status).toBe(200);
    expect(toThree.body).toMatchObject({ capacity: 3, activeCount: 3, remainingPlaces: 0 });
    const toTwo = await edit(o, event.id, { capacity: 2 });
    expect(toTwo.status).toBe(409);
    expect(toTwo.body.error.code).toBe('CAPACITY_BELOW_ACTIVE');
    expect((await stored(event.id)).capacity).toBe(3);
    expect(await activeCount(event.id)).toBe(3);
  });
});

describe('T-30 / AC-30: capacity increases only before the stored end', () => {
  test('event in progress: 1 ms before end 200; at end and 1 ms after 409 INVALID_STATE, capacity unchanged', async () => {
    // In progress: started 1 h ago, ends in 1 h, so the fake clock stays inside the 8 h session lifetime.
    const event = await createEvent({ capacity: 4, startsInMs: -3600000 });
    freezeAt(new Date(event.endsAt.getTime() - 1));
    expect((await edit(o, event.id, { capacity: 5 })).status).toBe(200);
    await prisma.event.update({ where: { id: event.id }, data: { capacity: 4 } });
    for (const after of [0, 1]) {
      freezeAt(new Date(event.endsAt.getTime() + after));
      const response = await edit(o, event.id, { capacity: 5 });
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('INVALID_STATE');
      expect((await stored(event.id)).capacity).toBe(4);
    }
  });
});

describe('T-31 / AC-31: an edit and a booking are serialized on the event row', () => {
  test('edit first: 200 then booking 409 EVENT_FULL, final 1 ACTIVE / capacity 1', async () => {
    const event = await createEvent({ capacity: 2 });
    await activeRows(event.id, 1);
    expect((await edit(o, event.id, { capacity: 1 })).status).toBe(200);
    const booking = await r.agent.post(`/api/events/${event.id}/registrations`).set('X-CSRF-Token', r.csrfToken);
    expect(booking.body.error.code).toBe('EVENT_FULL');
    expect([await activeCount(event.id), (await stored(event.id)).capacity]).toEqual([1, 1]);
  });

  test('booking first: 201 then edit 409 CAPACITY_BELOW_ACTIVE, final 2 ACTIVE / capacity 2', async () => {
    const event = await createEvent({ capacity: 2 });
    await activeRows(event.id, 1);
    expect((await r.agent.post(`/api/events/${event.id}/registrations`).set('X-CSRF-Token', r.csrfToken)).status).toBe(201);
    expect((await edit(o, event.id, { capacity: 1 })).body.error.code).toBe('CAPACITY_BELOW_ACTIVE');
    expect([await activeCount(event.id), (await stored(event.id)).capacity]).toEqual([2, 2]);
  });

  test('ten concurrent races: always one of the two outcomes and the ACTIVE count never exceeds capacity', async () => {
    for (let round = 0; round < 10; round++) {
      await prisma.registration.deleteMany(); await prisma.event.deleteMany();
      const event = await createEvent({ capacity: 2 });
      await activeRows(event.id, 1);
      const [editResponse, booking] = await Promise.all([
        edit(o, event.id, { capacity: 1 }),
        r.agent.post(`/api/events/${event.id}/registrations`).set('X-CSRF-Token', r.csrfToken),
      ]);
      const outcome = [editResponse.status, booking.status, await activeCount(event.id), (await stored(event.id)).capacity];
      expect([[200, 409, 1, 1], [409, 201, 2, 2]]).toContainEqual(outcome);
    }
  });
});

describe('T-32 / AC-32: only the owner can edit', () => {
  test('participant 403, other organizer 404, no session 401, missing CSRF 403, missing event 404; nothing stored', async () => {
    const event = await createEvent();
    const before = await stored(event.id);
    const asParticipant = await edit(p, event.id, { title: 'Taken over' });
    expect([asParticipant.status, asParticipant.body.error.code]).toEqual([403, 'FORBIDDEN']);
    expect((await edit(q, event.id, { title: 'Taken over' })).status).toBe(404);
    expect((await request(app).patch(`/api/events/${event.id}`).send({ title: 'Taken over' })).status).toBe(401);
    const noCsrf = await o.agent.patch(`/api/events/${event.id}`).send({ title: 'Taken over' });
    expect([noCsrf.status, noCsrf.body.error.code]).toEqual([403, 'CSRF_INVALID']);
    expect((await edit(o, 999999, { title: 'Taken over' })).status).toBe(404);
    expect(await stored(event.id)).toEqual(before);
  });
});
