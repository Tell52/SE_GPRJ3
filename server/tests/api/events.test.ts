import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { loadTestEnvironment } from '../helpers/test-database.js';
import { createUser, loginAs, resetTables } from '../helpers/api.js';

const env = loadTestEnvironment() as unknown as { DATABASE_URL: string };
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.NODE_ENV = 'test';
const { createApp } = await import('../../src/app.js');
const { prisma: appPrisma } = await import('../../src/db.js');
const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
const app = createApp();
let org: Awaited<ReturnType<typeof loginAs>>;
let foreign: typeof org;
let participant: typeof org;
let orgId: number;
let participantId: number;
let secondParticipantId: number;
const valid = () => ({ title: 'Git workshop', location: 'Room 1', capacity: 10,
  startsAt: new Date(Date.now() + 86400000).toISOString(), endsAt: new Date(Date.now() + 90000000).toISOString() });
const create = () => org.agent.post('/api/events').set('X-CSRF-Token', org.csrfToken).send(valid());
const publish = (id: number, login = org) => login.agent.post(`/api/events/${id}/publish`).set('X-CSRF-Token', login.csrfToken);
function noPrivateData(body: unknown) {
  for (const field of ['registrations', 'participantId', 'email', 'passwordHash', 'tokenHash', 'csrfToken', 'seedKey', '_count']) {
    expect(JSON.stringify(body)).not.toContain(`"${field}"`);
  }
}
beforeAll(async () => {
  await resetTables(prisma);
  const owner = await createUser(prisma, 'ORGANIZER', 'org1'); orgId = owner.id;
  const other = await createUser(prisma, 'ORGANIZER', 'org2');
  const p = await createUser(prisma, 'PARTICIPANT', 'p1'); participantId = p.id;
  secondParticipantId = (await createUser(prisma, 'PARTICIPANT', 'p2')).id;
  org = await loginAs(app, owner.email); foreign = await loginAs(app, other.email); participant = await loginAs(app, p.email);
});
afterAll(async () => { await resetTables(prisma); await prisma.$disconnect(); await appPrisma.$disconnect(); });

describe('T-05 to T-09 / events', () => {
  test('T-05 persists session-owned draft, lists mine, publishes and discovers', async () => {
    const response = await org.agent.post('/api/events').set('X-CSRF-Token', org.csrfToken).send({ ...valid(), organizerId: 999, status: 'PUBLISHED', publishedAt: new Date().toISOString() });
    expect(response.status).toBe(201);
    const id = response.body.id;
    expect(response.body).toMatchObject({ status: 'DRAFT', publishedAt: null, organizer: { id: orgId } });
    expect(await prisma.event.findUnique({ where: { id } })).toMatchObject({ organizerId: orgId, status: 'DRAFT' });
    expect((await org.agent.get('/api/events/mine')).body.items.some((e: { id: number }) => e.id === id)).toBe(true);
    expect((await foreign.agent.get('/api/events/mine')).body.items).toEqual([]);
    expect((await publish(id)).status).toBe(200);
    expect(await prisma.event.findUnique({ where: { id } })).toMatchObject({ status: 'PUBLISHED', publishedAt: expect.any(Date) });
    const discovered = await participant.agent.get('/api/events');
    expect(discovered.body.items.some((e: { id: number }) => e.id === id)).toBe(true); noPrivateData(discovered.body);
  });
  test.each([['capacity', 0], ['capacity', -1], ['capacity', 1.5], ['capacity', 1001], ['capacity', undefined],
    ['title', ' '], ['title', 'x'.repeat(121)], ['location', ''], ['location', 'x'.repeat(201)],
    ['description', 'x'.repeat(2001)], ['startsAt', '2020-01-01T00:00:00Z'], ['endsAt', 'invalid']])('T-06 rejects %s=%s without insertion', async (field, value) => {
    const count = await prisma.event.count();
    const response = await org.agent.post('/api/events').set('X-CSRF-Token', org.csrfToken).send({ ...valid(), [field as string]: value });
    expect(response.status).toBe(400); expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field })]));
    expect(await prisma.event.count()).toBe(count);
  });
  test.each([1, 1000])('T-06 accepts capacity %s', async (capacity) => {
    const response = await org.agent.post('/api/events').set('X-CSRF-Token', org.csrfToken).send({ ...valid(), capacity });
    expect(response.status).toBe(201);
    expect(await prisma.event.findUnique({ where: { id: response.body.id } })).toMatchObject({ capacity });
  });
  test('T-07 filters discovery, protects drafts and includes only own registration summary', async () => {
    const draft = (await create()).body;
    expect((await participant.agent.get(`/api/events/${draft.id}`)).status).toBe(404);
    expect((await foreign.agent.get(`/api/events/${draft.id}`)).status).toBe(404);
    expect((await org.agent.get(`/api/events/${draft.id}`)).status).toBe(200);
    const event = (await create()).body; await publish(event.id);
    const own = await prisma.registration.create({ data: { eventId: event.id, participantId } });
    await prisma.registration.create({ data: { eventId: event.id, participantId: secondParticipantId } });
    const past = await prisma.event.create({ data: { ...valid(), organizerId: orgId, status: 'PUBLISHED', startsAt: new Date(Date.now() - 3600000), endsAt: new Date(Date.now() + 3600000) } });
    const list = (await participant.agent.get('/api/events')).body.items;
    expect(list.find((e: { id: number }) => e.id === event.id)).toMatchObject({ activeCount: 2, remainingPlaces: 8 });
    expect(list.some((e: { id: number }) => [draft.id, past.id].includes(e.id))).toBe(false);
    const times = list.map((e: { startsAt: string }) => Date.parse(e.startsAt));
    expect(times).toEqual([...times].sort((a: number, b: number) => a - b));
    const detail = (await participant.agent.get(`/api/events/${event.id}`)).body;
    expect(detail.myRegistration).toEqual({ id: own.id, status: 'ACTIVE' }); noPrivateData(detail);
    expect((await org.agent.get(`/api/events/${event.id}`)).body).not.toHaveProperty('myRegistration');
    noPrivateData(list);
  });
  test('T-08 repeated and concurrent publication changes state only once; past start rejected', async () => {
    const event = (await create()).body;
    const results = await Promise.all([publish(event.id), publish(event.id)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const before = await prisma.event.findUnique({ where: { id: event.id } });
    const again = await publish(event.id);
    expect(again.status).toBe(409); expect(again.body.error.code).toBe('INVALID_STATE');
    expect(await prisma.event.findUnique({ where: { id: event.id } })).toEqual(before);
    const draft = (await create()).body;
    await prisma.event.update({ where: { id: draft.id }, data: { startsAt: new Date(Date.now() - 1000) } });
    const old = await prisma.event.findUnique({ where: { id: draft.id } });
    expect((await publish(draft.id)).status).toBe(409);
    expect(await prisma.event.findUnique({ where: { id: draft.id } })).toEqual(old);
  });
  test('T-09 participant and foreign owner cannot mutate events', async () => {
    const draft = (await create()).body;
    const before = await prisma.event.findMany();
    expect((await participant.agent.post('/api/events').set('X-CSRF-Token', participant.csrfToken).send(valid())).status).toBe(403);
    expect((await publish(draft.id, participant)).status).toBe(403);
    expect((await publish(draft.id, foreign)).status).toBe(404);
    expect((await participant.agent.get('/api/events/mine')).status).toBe(403);
    expect(await prisma.event.findMany()).toEqual(before);
  });
  test('T-03 extension: all event endpoints require session and writes require CSRF', async () => {
    const draft = (await create()).body;
    const before = await prisma.event.findMany();
    for (const path of ['/api/events', '/api/events/mine', `/api/events/${draft.id}`]) expect((await request(app).get(path)).status).toBe(401);
    for (const path of ['/api/events', `/api/events/${draft.id}/publish`]) {
      expect((await request(app).post(path).send(valid())).status).toBe(401);
      for (const token of ['', 'wrong', participant.csrfToken]) {
        const response = await org.agent.post(path).set('X-CSRF-Token', token).send(valid());
        expect(response.status).toBe(403); expect(response.body.error.code).toBe('CSRF_INVALID');
      }
    }
    expect(await prisma.event.findMany()).toEqual(before);
  });
  test.each(['0', '-1', '1.5', 'abc', '999999999999999999999', '2147483648', '999999'])('invalid or missing id %s returns 404', async (id) => {
    expect((await org.agent.get(`/api/events/${id}`)).status).toBe(404);
    expect((await org.agent.post(`/api/events/${id}/publish`).set('X-CSRF-Token', org.csrfToken)).status).toBe(404);
  });
});
