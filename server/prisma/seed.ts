import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedDatabase } from './seed-data.js';

const prisma = new PrismaClient();
try {
  await seedDatabase(prisma, process.env.SEED_PASSWORD ?? '');
  console.log('Seed complete: existing rows and passwords preserved.');
} catch {
  console.error('Seed failed. Check DATABASE_URL, applied migrations and a non-placeholder SEED_PASSWORD (maximum 72 UTF-8 bytes).');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
