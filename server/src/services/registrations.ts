import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError, notFound } from '../errors.js';
import { decideRegistration, type RegistrationDecision } from './registration-rules.js';

const registrationSelect = {
  id: true, status: true, registeredAt: true, cancelledAt: true, cancelledBy: true,
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

export async function cancelMyRegistration(id: number, participantId: number) {
  return prisma.$transaction(async (tx) => {
    // Serialize with bookings before reading the receipt's current status.
    const [event] = await tx.$queryRaw<{ startsAt: Date }[]>`
      SELECT e."startsAt" FROM "Event" e JOIN "Registration" r ON r."eventId" = e.id
      WHERE r.id = ${id} AND r."participantId" = ${participantId} FOR UPDATE OF e`;
    if (!event) throw notFound();
    const now = new Date();
    const receipt = await tx.registration.findUniqueOrThrow({ where: { id }, select: { status: true } });
    if (receipt.status !== 'ACTIVE') throw new AppError(409, 'INVALID_STATE', 'This registration is already cancelled.');
    if (now >= event.startsAt) throw new AppError(409, 'CANCELLATION_CLOSED', 'This event has started. Cancellation is closed.');
    return tx.registration.update({
      where: { id }, data: { status: 'CANCELLED', cancelledBy: 'PARTICIPANT', cancelledAt: now }, select: registrationSelect,
    });
  }, TRANSACTION_LIMITS);
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
