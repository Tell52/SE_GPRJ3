import { prisma } from '../db.js';
import { notFound } from '../errors.js';

export async function getEventRoster(id: number, organizerId: number) {
  const event = await prisma.event.findFirst({
    where: { id, organizerId }, select: { id: true, title: true, capacity: true },
  });
  // Do not query participant data until event ownership has been established.
  if (!event) throw notFound();
  const items = await prisma.registration.findMany({
    where: { eventId: id }, orderBy: [{ registeredAt: 'asc' }, { id: 'asc' }],
    select: { id: true, status: true, registeredAt: true,
      participant: { select: { id: true, name: true, email: true } } },
  });
  return { event, count: items.length, items };
}
