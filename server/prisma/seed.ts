import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedDatabase } from './seed-data.js';

const prisma = new PrismaClient();
try {
  // Local/CI use SEED_PASSWORD. The Cloud Run job from the lab starter kit maps
  // DEMO_USER_PASSWORD (deploy.sh --demo) and always ADMIN_PASSWORD, so use those.
  const seedPassword =
    process.env.SEED_PASSWORD || process.env.DEMO_USER_PASSWORD || process.env.ADMIN_PASSWORD || '';
  await seedDatabase(prisma, seedPassword);
  console.log('Seed complete: existing rows and passwords preserved.');
} catch {
  console.error('Seed failed. Check DATABASE_URL, applied migrations and a non-placeholder SEED_PASSWORD (maximum 72 UTF-8 bytes).');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}