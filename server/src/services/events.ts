import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { registrationCutoff } from './registration-rules.js';
import { AppError, notFound } from '../errors.js';
import type { SessionUser } from '../auth/session.js';
import type { EventInput, EventPatch } from '../validation/events.js';

const eventSelect = {
  id: true, title: true, description: true, location: true, startsAt: true, endsAt: true,
  capacity: true, status: true, publishedAt: true, registrationDeadline: true,
  organizer: { select: { id: true, name: true } },
  _count: { select: { registrations: { where: { status: 'ACTIVE' } } } },
} satisfies Prisma.EventSelect;

type SelectedEvent = Prisma.EventGetPayload<{ select: typeof eventSelect }>;
function present({ _count, ...event }: SelectedEvent) {
  const effectiveCutoff = registrationCutoff(event.startsAt, event.registrationDeadline);
  return { ...event, effectiveCutoff, serverTime: new Date(), activeCount: _count.registrations, remainingPlaces: event.capacity - _count.registrations };
}

export async function createEvent(input: EventInput, organizerId: number) {
  return present(await prisma.event.create({ data: { ...input, organizerId, status: 'DRAFT' }, select: eventSelect }));
}

export async function listEvents(organizerId?: number) {
  const items = await prisma.event.findMany({
    where: organizerId === undefined ? { status: 'PUBLISHED', startsAt: { gt: new Date() } } : { organizerId },
    orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], select: eventSelect,
  });
  return { items: items.map(present) };
}

export async function eventDetail(id: number, user: SessionUser) {
  const event = await prisma.event.findFirst({
    where: { id, OR: [{ status: 'PUBLISHED' }, { organizerId: user.id }] }, select: eventSelect,
  });
  if (!event) throw notFound();
  if (user.role !== 'PARTICIPANT') return present(event);
  const myRegistration = await prisma.registration.findFirst({
    where: { eventId: id, participantId: user.id, status: 'ACTIVE' }, select: { id: true, status: true },
  });
  return { ...present(event), myRegistration };
}

export async function publishEvent(id: number, organizerId: number) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const updated = await tx.event.updateMany({
      where: { id, organizerId, status: 'DRAFT', startsAt: { gt: now } },
      data: { status: 'PUBLISHED', publishedAt: now },
    });
    if (!updated.count) {
      const owned = await tx.event.findFirst({ where: { id, organizerId }, select: { id: true } });
      if (!owned) throw notFound();
      throw new AppError(409, 'INVALID_STATE', 'Only a draft event that has not started can be published.');
    }
    return present(await tx.event.findUniqueOrThrow({ where: { id }, select: eventSelect }));
  });
}

const TRANSACTION_LIMITS = { maxWait: 15000, timeout: 15000 };

/**
 * F-07 (#52, BR-09): the owner edits a draft or published event. The event row is locked FOR UPDATE, the
 * same lock a booking takes, so an edit and a registration never interleave and capacity is always
 * compared with the committed ACTIVE count. Checks: owner (404), merged schedule (400), capacity below
 * ACTIVE (409 CAPACITY_BELOW_ACTIVE), capacity increase at or after the stored end (409 INVALID_STATE).
 */
export async function updateEvent(id: number, patch: EventPatch, organizerId: number) {
  return prisma.$transaction(async (tx) => {
    const [current] = await tx.$queryRaw<{ startsAt: Date; endsAt: Date; capacity: number; registrationDeadline: Date | null }[]>`
      SELECT "startsAt", "endsAt", "capacity", "registrationDeadline" FROM "Event" WHERE "id" = ${id} AND "organizerId" = ${organizerId} FOR UPDATE`;
    if (!current) throw notFound();
    const now = new Date();
    const startsAt = patch.startsAt ? new Date(patch.startsAt) : current.startsAt;
    const endsAt = patch.endsAt ? new Date(patch.endsAt) : current.endsAt;
    const details: { field: string; message: string }[] = [];
    const deadline = patch.registrationDeadline === undefined ? current.registrationDeadline
      : patch.registrationDeadline === null ? null : new Date(patch.registrationDeadline);
    if (deadline && deadline > startsAt) {
      details.push({ field: 'registrationDeadline', message: 'Registration deadline must be at or before the event start.' });
    }
    // An unchanged start may already be in the past (capacity edits during the event); a changed one may not.
    if (patch.startsAt && startsAt.getTime() !== current.startsAt.getTime() && startsAt <= now) {
      details.push({ field: 'startsAt', message: 'Start must be in the future.' });
    }
    if (endsAt <= startsAt) details.push({ field: 'endsAt', message: 'End must be after start.' });
    if (details.length) throw new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid.', details);

    if (patch.capacity !== undefined) {
      const active = await tx.registration.count({ where: { eventId: id, status: 'ACTIVE' } });
      if (patch.capacity < active) {
        throw new AppError(409, 'CAPACITY_BELOW_ACTIVE', `Capacity cannot be lower than the ${active} active registrations.`);
      }
      if (patch.capacity > current.capacity && now >= current.endsAt) {
        throw new AppError(409, 'INVALID_STATE', 'Capacity cannot be increased after the event has ended.');
      }
    }
    return present(await tx.event.update({
      where: { id },
      data: { ...patch, ...(patch.startsAt && { startsAt }), ...(patch.endsAt && { endsAt }) },
      select: eventSelect,
    }));
  }, TRANSACTION_LIMITS);
}
