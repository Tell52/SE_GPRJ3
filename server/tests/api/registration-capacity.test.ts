import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { loadTestEnvironment } from '../helpers/test-database.js';
import { createUser, loginAs, resetTables } from '../helpers/api.js';

// T-12 is the planned TDD test (tests.md). Its assertions must stay unchanged between the red and green commits.
const env = loadTestEnvironment() as unknown as { DATABASE_URL: string };
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.NODE_ENV = 'test';
const { createApp } = await import('../../src/app.js');
const { prisma: appPrisma } = await import('../../src/db.js');
const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
const app = createApp();

beforeAll(async () => { await resetTables(prisma); });
afterAll(async () => { await resetTables(prisma); await prisma.$disconnect(); await appPrisma.$disconnect(); });

describe('T-12 (API, TDD) / AC-12: full event rejects a new participant', () => {
  test('capacity 2 with two ACTIVE registrations: a third participant gets 409 EVENT_FULL and nothing is stored', async () => {
    const organizer = await createUser(prisma, 'ORGANIZER', 't12-org');
    const p1 = await createUser(prisma, 'PARTICIPANT', 't12-p1');
    const p2 = await createUser(prisma, 'PARTICIPANT', 't12-p2');
    const p3 = await createUser(prisma, 'PARTICIPANT', 't12-p3');
    const event = await prisma.event.create({ data: {
      organizerId: organizer.id, title: 'Full workshop', location: 'Room 2', capacity: 2, status: 'PUBLISHED', publishedAt: new Date(),
      startsAt: new Date(Date.now() + 86400000), endsAt: new Date(Date.now() + 90000000),
    } });
    await prisma.registration.createMany({ data: [
      { eventId: event.id, participantId: p1.id }, { eventId: event.id, participantId: p2.id },
    ] });

    const third = await loginAs(app, p3.email);
    const response = await third.agent.post(`/api/events/${event.id}/registrations`).set('X-CSRF-Token', third.csrfToken);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EVENT_FULL');
    expect(await prisma.registration.count({ where: { eventId: event.id, status: 'ACTIVE' } })).toBe(2);
    expect(await prisma.registration.count({ where: { participantId: p3.id } })).toBe(0);
  });
});
