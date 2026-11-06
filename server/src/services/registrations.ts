import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError, notFound } from '../errors.js';
import { decideRegistration, type RegistrationDecision } from './registration-rules.js';

const registrationSelect = {
  id: true, status: true, registeredAt: true,
  event: { select: { id: true, title: true, startsAt: true, endsAt: true, location: true } },
} satisfies Prisma.RegistrationSelect;

const rejections: Record<Exclude<RegistrationDecision, 'OK'>, () => AppError> = {
  NOT_FOUND: notFound,
  REGISTRATION_CLOSED: () => new AppError(409, 'REGISTRATION_CLOSED', 'Registration for this event is closed.'),
  ALREADY_REGISTERED: () => new AppError(409, 'ALREADY_REGISTERED', 'You are already registered for this event.'),
  EVENT_FULL: () => new AppError(409, 'EVENT_FULL', 'This event has no places left.'),
};

type LockedEvent = { status: 'DRAFT' | 'PUBLISHED'; startsAt: Date; capacity: number };

// Requests for the same event queue behind the row lock. Prisma's defaults (2 s to get a connection,
// 5 s per transaction) are too short when many people register at once, so queued requests failed with
// P2028 instead of a clean answer. These limits let them wait their turn.
const TRANSACTION_LIMITS = { maxWait: 15000, timeout: 15000 };

/**
 * Registers the session participant (BR-02 to BR-04) in one transaction.
 * SELECT ... FOR UPDATE locks the event row, so concurrent registrations for the same event
 * run one at a time and the count below is never stale. 201 is only returned after commit.
 */
export async function registerForEvent(eventId: number, participantId: number) {
  try {
    return await prisma.$transaction(async (tx) => {
      const [event] = await tx.$queryRaw<LockedEvent[]>`
        SELECT "status"::text AS "status", "startsAt", "capacity" FROM "Event" WHERE "id" = ${eventId} FOR UPDATE`;
      const [hasActiveRegistration, activeCount] = event ? await Promise.all([
        tx.registration.count({ where: { eventId, participantId, status: 'ACTIVE' } }).then((n) => n > 0),
        tx.registration.count({ where: { eventId, status: 'ACTIVE' } }),
      ]) : [false, 0];

      const decision = decideRegistration({ event: event ?? null, hasActiveRegistration, activeCount, now: new Date() });
      if (decision !== 'OK') throw rejections[decision]();

      return tx.registration.create({ data: { eventId, participantId, status: 'ACTIVE' }, select: registrationSelect });
    }, TRANSACTION_LIMITS);
  } catch (error) {
    // Backstop: the partial unique index registration_one_active rejects a second ACTIVE row.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw rejections.ALREADY_REGISTERED();
    // Overloaded beyond the limits above: answer clearly instead of a 500. Nothing was stored.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2028') throw new AppError(503, 'SERVICE_BUSY', 'The server is busy. Please try again.');
    throw error;
  }
}

export async function listMyRegistrations(participantId: number) {
  const items = await prisma.registration.findMany({
    where: { participantId },
    orderBy: [{ event: { startsAt: 'asc' } }, { id: 'asc' }],
    select: registrationSelect,
  });
  return { items };
}

/** A registration is visible only to its holder; anyone else gets 404 so its existence is not revealed. */
export async function getMyRegistration(id: number, participantId: number) {
  const registration = await prisma.registration.findFirst({ where: { id, participantId }, select: registrationSelect });
  if (!registration) throw notFound();
  return registration;
}
