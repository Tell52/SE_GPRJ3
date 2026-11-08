import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { loadTestEnvironment } from '../helpers/test-database.js';
import { createUser, loginAs, resetTables } from '../helpers/api.js';

const env = loadTestEnvironment() as unknown as { DATABASE_URL: string };
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.NODE_ENV = 'test';
const { createApp } = await import('../../src/app.js');
const { prisma: appPrisma } = await import('../../src/db.js');
const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
const app = createApp();
let owner: Awaited<ReturnType<typeof loginAs>>;
let foreign: typeof owner;
let participant: typeof owner;
let eventId: number;
let emptyId: number;
let expected: unknown[];

beforeAll(async () => {
  await resetTables(prisma);
  const org = await createUser(prisma, 'ORGANIZER', 'roster-owner');
  const other = await createUser(prisma, 'ORGANIZER', 'roster-foreign');
  const p1 = await createUser(prisma, 'PARTICIPANT', 'roster-first');
  const p2 = await createUser(prisma, 'PARTICIPANT', 'roster-second');
  owner = await loginAs(app, org.email); foreign = await loginAs(app, other.email);
  participant = await loginAs(app, p1.email);
  const data = { organizerId: org.id, title: 'Private roster', location: 'Room 1', capacity: 3,
    startsAt: new Date('2099-11-20T07:00:00Z'), endsAt: new Date('2099-11-20T09:00:00Z') };
  eventId = (await prisma.event.create({ data: { ...data, status: 'PUBLISHED' } })).id;
  emptyId = (await prisma.event.create({ data })).id;
  // Insert in reverse time order, so sorting by insertion ID alone cannot pass.
  const second = await prisma.registration.create({ data: { eventId, participantId: p2.id, registeredAt: new Date('2026-11-06T02:00:00Z') } });
  const first = await prisma.registration.create({ data: { eventId, participantId: p1.id, registeredAt: new Date('2026-11-06T01:00:00Z') } });
  expected = ([[first, p1], [second, p2]] as const).map(([r, p]) => ({ id: r.id, status: r.status,
    registeredAt: r.registeredAt.toISOString(), participant: { id: p.id, name: p.name, email: p.email } }));
});
afterAll(async () => { await resetTables(prisma); await prisma.$disconnect(); await appPrisma.$disconnect(); });

test('T-16: owner receives exact stored fields in time order and count, without private fields or writes', async () => {
  const before = await prisma.registration.findMany();
  const response = await owner.agent.get(`/api/events/${eventId}/registrations`);
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ event: { id: eventId, title: 'Private roster', capacity: 3 }, count: 2, items: expected });
  expect(await prisma.registration.findMany()).toEqual(before);
});
test('T-16: an owned empty draft returns an empty collection', async () => {
  const response = await owner.agent.get(`/api/events/${emptyId}/registrations`);
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ event: { id: emptyId, title: 'Private roster', capacity: 3 }, count: 0, items: [] });
});
test('T-17 / T-03: anonymous 401, participant 403, foreign organizer 404; no roster query or private data', async () => {
  const query = vi.spyOn(appPrisma.registration, 'findMany');
  try {
    for (const [agent, status, code] of [[request(app), 401, 'UNAUTHENTICATED'], [participant.agent, 403, 'FORBIDDEN'], [foreign.agent, 404, 'NOT_FOUND']] as const) {
      const response = await agent.get(`/api/events/${eventId}/registrations`);
      expect(response.status).toBe(status);
      expect(Object.keys(response.body)).toEqual(['error']);
      expect(response.body.error.code).toBe(code);
      expect(JSON.stringify(response.body)).not.toMatch(/roster-first|roster-second|participant|password|token/i);
    }
    expect(query).not.toHaveBeenCalled();
  } finally { query.mockRestore(); }
});
test.each(['0', '-1', '1.5', 'abc', '2147483648', '999999999999999999999', '999999'])('missing or invalid event %s returns 404', async (id) => {
  const response = await owner.agent.get(`/api/events/${id}/registrations`);
  expect(response.status).toBe(404); expect(Object.keys(response.body)).toEqual(['error']);
});
