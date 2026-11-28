import { prisma } from '../db.js';
import { AppError, notFound } from '../errors.js';
import { decideCheckIn, type CheckInDecision } from './registration-rules.js';

const TRANSACTION_LIMITS = { maxWait: 15000, timeout: 15000 };
export const rosterItemSelect = {
  id: true, status: true, registeredAt: true, checkedInAt: true,
  participant: { select: { id: true, name: true, email: true } },
} as const;

const rejections: Record<Exclude<CheckInDecision, 'OK'>, () => AppError> = {
  INVALID_STATE: () => new AppError(409, 'INVALID_STATE', 'Only an active registration on a published event can be checked in.'),
  ALREADY_CHECKED_IN: () => new AppError(409, 'ALREADY_CHECKED_IN', 'This participant is already checked in.'),
  CHECK_IN_CLOSED: () => new AppError(409, 'CHECK_IN_CLOSED', 'Check-in is open from 1 hour before start until the event ends.'),
};

/**
 * F-09: the owning organizer checks in a registration. The event row is locked FOR UPDATE, the same lock
 * bookings, edits and event cancellation take, and the registration is re-read under it, so two check-ins
 * of one receipt cannot both succeed and a check-in never interleaves with a cancellation.
 * A registration on another organizer's event answers 404, the same as a missing one.
 */
export async function checkInRegistration(id: number, organizerId: number) {
  return prisma.$transaction(async (tx) => {
    const found = await tx.registration.findFirst({ where: { id, event: { organizerId } }, select: { eventId: true } });
    if (!found) throw notFound();
    const [event] = await tx.$queryRaw<{ status: string; startsAt: Date; endsAt: Date }[]>`
      SELECT "status"::text AS "status", "startsAt", "endsAt" FROM "Event" WHERE "id" = ${found.eventId} FOR UPDATE`;
    const current = await tx.registration.findUniqueOrThrow({ where: { id }, select: { status: true, checkedInAt: true } });
    const now = new Date();
    const decision = decideCheckIn({ eventStatus: event.status, status: current.status, checkedInAt: current.checkedInAt,
      startsAt: event.startsAt, endsAt: event.endsAt, now });
    if (decision !== 'OK') throw rejections[decision]();
    return tx.registration.update({ where: { id }, data: { checkedInAt: now }, select: rosterItemSelect });
  }, TRANSACTION_LIMITS);
}
