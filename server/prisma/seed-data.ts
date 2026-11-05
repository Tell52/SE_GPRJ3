import { PrismaClient, Role, EventStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

export async function seedDatabase(prisma: PrismaClient, password: string) {
  if (!password || password.startsWith('replace_with_') || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Set SEED_PASSWORD locally to a non-placeholder password of at most 72 UTF-8 bytes.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    // Serialize seed runs; do not overwrite existing demo or application data.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(193471, 2)`;
    const accounts = [
      ['organizer1@example.test', 'Organizer One', Role.ORGANIZER],
      ['organizer2@example.test', 'Organizer Two', Role.ORGANIZER],
      ['participant1@example.test', 'Participant One', Role.PARTICIPANT],
      ['participant2@example.test', 'Participant Two', Role.PARTICIPANT],
      ['participant3@example.test', 'Participant Three', Role.PARTICIPANT],
    ] as const;
    for (const [email, name, role] of accounts) {
      await tx.user.upsert({ where: { email }, update: {}, create: { email, name, role, passwordHash } });
    }
    const organizer = await tx.user.findUniqueOrThrow({ where: { email: accounts[0][0] } });
    const startsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
    for (const [seedKey, title, status] of [
      ['demo-draft', 'Workshop planning practice', EventStatus.DRAFT],
      ['demo-published', 'Introduction to Git', EventStatus.PUBLISHED],
    ] as const) {
      await tx.event.upsert({
        where: { seedKey }, update: {},
        create: {
          seedKey, title, status, organizerId: organizer.id,
          description: 'Synthetic workshop for local demonstration.', location: 'Demo Room',
          capacity: 30, startsAt, endsAt,
          publishedAt: status === EventStatus.PUBLISHED ? new Date() : null,
        },
      });
    }
  });
}
