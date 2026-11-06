import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError, notFound } from '../errors.js';
import type { SessionUser } from '../auth/session.js';
import type { EventInput } from '../validation/events.js';

const eventSelect = {
  id: true, title: true, description: true, location: true, startsAt: true, endsAt: true,
  capacity: true, status: true, publishedAt: true,
  organizer: { select: { id: true, name: true } },
  _count: { select: { registrations: { where: { status: 'ACTIVE' } } } },
} satisfies Prisma.EventSelect;

type SelectedEvent = Prisma.EventGetPayload<{ select: typeof eventSelect }>;
function present({ _count, ...event }: SelectedEvent) {
  return { ...event, activeCount: _count.registrations, remainingPlaces: event.capacity - _count.registrations };
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
