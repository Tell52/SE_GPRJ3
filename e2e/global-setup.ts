import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';
import { seedDatabase } from '../server/prisma/seed-data.ts';
import { e2eEnvironment, SERVER_DIR } from './support/test-env.ts';

/**
 * Prepares the guarded test database once per E2E run: apply committed migrations, empty every table,
 * then load the normal demo seed (organizer1, organizer2, participant1 to participant3).
 */
export default async function globalSetup() {
  const env = e2eEnvironment();
  const require = createRequire(import.meta.url);
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: SERVER_DIR, env, stdio: 'pipe', timeout: 120000,
  });

  const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
  try {
    await prisma.$executeRawUnsafe('TRUNCATE "Registration", "Session", "Event", "User" RESTART IDENTITY CASCADE');
    await seedDatabase(prisma, env.SEED_PASSWORD);
  } finally {
    await prisma.$disconnect();
  }
  // Read by the journey to log in as the seeded accounts.
  process.env.E2E_SEED_PASSWORD = env.SEED_PASSWORD;
}
