import request from 'supertest';
import { PrismaClient, type User } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { loadTestEnvironment } from '../helpers/test-database.js';
import { createUser, loginAs, resetTables } from '../helpers/api.js';

// F-08 event cancellation (#54): T-33 to T-36 in docs/sprints/sprint-2/tests.md, plus the cancelled-event case of T-32.
const env = loadTestEnvironment() as unknown as { DATABASE_URL: string };
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.NODE_ENV = 'test';
const { createApp } = await import('../../src/app.js');
const { prisma: appPrisma } = await import('../../src/db.js');
const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
const app = createApp();

type Login = Awaited<ReturnType<typeof loginAs>>;
let owner: User;
let people: User[];
let o: Login; let q: Login; let p: Login; let r: Login;

const DAY = 86400000;
async function createEvent({ capacity = 5, status = 'PUBLISHED' }: { capacity?: number; status?: 'DRAFT' | 'PUBLISHED' } = {}) {
  const startsAt = new Date(Date.now() + DAY);
  return prisma.event.create({ data: {
    organizerId: owner.id, title: 'Cancelled workshop', location: 'CB2301', capacity, status,
    publishedAt: status === 'PUBLISHED' ? new Date() : null, startsAt, endsAt: new Date(startsAt.getTime() + 2 * 3600000),
  } });
}
const cancelEvent = (login: Login, id: number) => login.agent.post(`/api/events/${id}/cancel`).set('X-CSRF-Token', login.csrfToken);
const book = (login: Login, id: number) => login.agent.post(`/api/events/${id}/registrations`).set('X-CSRF-Token', login.csrfToken);
const rows = (eventId: number) => prisma.registration.findMany({
  where: { eventId }, orderBy: { id: 'asc' }, select: { id: true, participantId: true, status: true, cancelledBy: true, cancelledAt: true },
});
const activeCount = (eventId: number) => prisma.registration.count({ where: { eventId, status: 'ACTIVE' } });

/** Two ACTIVE rows (P, R) and one earlier participant cancellation (S). */
async function mixedEvent() {
  const event = await createEvent();
  const s = people[2];
  for (const login of [p, r]) expect((await book(login, event.id)).status).toBe(201);
  const earlier = new Date(Date.now() - 3600000);
  await prisma.registration.create({ data: { eventId: event.id, participantId: s.id, status: 'CANCELLED', cancelledBy: 'PARTICIPANT', cancelledAt: earlier } });
  return { event, earlier, sId: s.id };
}

beforeAll(async () => {
  await resetTables(prisma);
  owner = await createUser(prisma, 'ORGANIZER', 'ecan-o');
  await createUser(prisma, 'ORGANIZER', 'ecan-q');
  people = [];
  for (const label of ['ecan-p', 'ecan-r', 'ecan-s', 'ecan-t']) people.push(await createUser(prisma, 'PARTICIPANT', label));
  o = await loginAs(app, 'ecan-o@example.test');
  q = await loginAs(app, 'ecan-q@example.test');
  p = await loginAs(app, 'ecan-p@example.test');
  r = await loginAs(app, 'ecan-r@example.test');
});
beforeEach(async () => { await prisma.registration.deleteMany(); await prisma.event.deleteMany(); });
afterAll(async () => { await prisma.$disconnect(); await appPrisma.$disconnect(); });

describe('T-33 / AC-33: cancel a published event and preserve history', () => {
  test('200 CANCELLED; both ACTIVE rows become organizer-cancelled at one server time; the earlier participant cancellation is unchanged; a repeat is 409', async () => {
    const { event, earlier, sId } = await mixedEvent();
    const before = await rows(event.id);

    const response = await cancelEvent(o, event.id);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: event.id, status: 'CANCELLED', activeCount: 0 });

    const after = await rows(event.id);
    expect(after.map((x) => x.id)).toEqual(before.map((x) => x.id));
    const organizerCancelled = after.filter((x) => x.participantId !== sId);
    expect(organizerCancelled.map((x) => [x.status, x.cancelledBy])).toEqual([['CANCELLED', 'ORGANIZER'], ['CANCELLED', 'ORGANIZER']]);
    expect(new Set(organizerCancelled.map((x) => x.cancelledAt?.getTime())).size).toBe(1);
    const prior = after.find((x) => x.participantId === sId)!;
    expect([prior.status, prior.cancelledBy, prior.cancelledAt?.getTime()]).toEqual(['CANCELLED', 'PARTICIPANT', earlier.getTime()]);

    const again = await cancelEvent(o, event.id);
    expect([again.status, again.body.error.code]).toEqual([409, 'INVALID_STATE']);
    expect(await rows(event.id)).toEqual(after);
  });

  test('a draft cannot be cancelled: 409 INVALID_STATE and it stays DRAFT', async () => {
    const draft = await createEvent({ status: 'DRAFT' });
    const response = await cancelEvent(o, draft.id);
    expect([response.status, response.body.error.code]).toEqual([409, 'INVALID_STATE']);
    expect((await prisma.event.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe('DRAFT');
  });
});

describe('T-34 / AC-34: both roles see the saved cancellation', () => {
  test('owner detail and list show CANCELLED; participant receipt and history show organizer cancellation; discovery omits it; a new booking gets 404', async () => {
    const { event } = await mixedEvent();
    const pReceipt = (await p.agent.get('/api/registrations/mine')).body.items[0];
    expect((await cancelEvent(o, event.id)).status).toBe(200);

    expect((await o.agent.get(`/api/events/${event.id}`)).body.status).toBe('CANCELLED');
    expect((await o.agent.get('/api/events/mine')).body.items).toMatchObject([{ id: event.id, status: 'CANCELLED' }]);
    expect((await p.agent.get(`/api/registrations/${pReceipt.id}`)).body).toMatchObject({ status: 'CANCELLED', cancelledBy: 'ORGANIZER' });
    expect((await p.agent.get('/api/registrations/mine')).body.items).toMatchObject([{ id: pReceipt.id, status: 'CANCELLED', cancelledBy: 'ORGANIZER' }]);
    expect((await p.agent.get('/api/events')).body.items.map((e: { id: number }) => e.id)).not.toContain(event.id);

    const late = await book(p, event.id);
    expect([late.status, late.body.error.code]).toEqual([404, 'NOT_FOUND']);
    expect(await activeCount(event.id)).toBe(0);
  });

  test('T-32 cancelled-event case: editing a cancelled event is 409 INVALID_STATE and changes nothing', async () => {
    const { event } = await mixedEvent();
    expect((await cancelEvent(o, event.id)).status).toBe(200);
    const before = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    const response = await o.agent.patch(`/api/events/${event.id}`).set('X-CSRF-Token', o.csrfToken).send({ title: 'Back again' });
    expect([response.status, response.body.error.code]).toEqual([409, 'INVALID_STATE']);
    expect(await prisma.event.findUniqueOrThrow({ where: { id: event.id } })).toEqual(before);
  });
});

describe('T-35 / AC-35: cancellation and booking are serialized on the event row', () => {
  test('booking first: 201 then that row becomes organizer-cancelled; final CANCELLED with zero ACTIVE', async () => {
    const event = await createEvent();
    expect((await book(p, event.id)).status).toBe(201);
    expect((await cancelEvent(o, event.id)).status).toBe(200);
    expect((await rows(event.id)).map((x) => [x.status, x.cancelledBy])).toEqual([['CANCELLED', 'ORGANIZER']]);
  });

  test('cancel first: booking gets 404 and inserts nothing', async () => {
    const event = await createEvent();
    expect((await cancelEvent(o, event.id)).status).toBe(200);
    expect((await book(p, event.id)).status).toBe(404);
    expect(await rows(event.id)).toEqual([]);
  });

  test('ten concurrent races: cancel always succeeds, the booking is 201 (then organizer-cancelled) or 404, and zero ACTIVE remain', async () => {
    for (let round = 0; round < 10; round++) {
      await prisma.registration.deleteMany(); await prisma.event.deleteMany();
      const event = await createEvent();
      const [cancelled, booking] = await Promise.all([cancelEvent(o, event.id), book(p, event.id)]);
      expect(cancelled.status).toBe(200);
      expect([201, 404]).toContain(booking.status);
      const final = await rows(event.id);
      expect(final.map((x) => [x.status, x.cancelledBy])).toEqual(booking.status === 201 ? [['CANCELLED', 'ORGANIZER']] : []);
      expect((await prisma.event.findUniqueOrThrow({ where: { id: event.id } })).status).toBe('CANCELLED');
    }
  });
});

describe('T-36 / AC-36: only the owner can cancel the event', () => {
  test('participant 403, other organizer 404, no session 401, missing CSRF 403, missing event 404; event and rows unchanged', async () => {
    const { event } = await mixedEvent();
    const before = await rows(event.id);
    const asParticipant = await cancelEvent(p, event.id);
    expect([asParticipant.status, asParticipant.body.error.code]).toEqual([403, 'FORBIDDEN']);
    expect((await cancelEvent(q, event.id)).status).toBe(404);
    expect((await request(app).post(`/api/events/${event.id}/cancel`)).status).toBe(401);
    const noCsrf = await o.agent.post(`/api/events/${event.id}/cancel`);
    expect([noCsrf.status, noCsrf.body.error.code]).toEqual([403, 'CSRF_INVALID']);
    expect((await cancelEvent(o, 999999)).status).toBe(404);
    expect((await prisma.event.findUniqueOrThrow({ where: { id: event.id } })).status).toBe('PUBLISHED');
    expect(await rows(event.id)).toEqual(before);
  });
});
