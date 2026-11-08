import { resolve } from 'node:path';
import { loadTestEnvironment } from '../../server/tests/helpers/test-database.ts';

export const SERVER_DIR = resolve(import.meta.dirname, '../../server');

/**
 * Loads server/.env.test through the same guard the server tests use, so E2E runs can only touch
 * the dedicated test database, never the development database.
 */
export function e2eEnvironment(): NodeJS.ProcessEnv & { DATABASE_URL: string; SEED_PASSWORD: string } {
  const previous = process.cwd();
  process.chdir(SERVER_DIR);
  try {
    const env = loadTestEnvironment() as unknown as NodeJS.ProcessEnv & { DATABASE_URL: string; SEED_PASSWORD: string };
    if (!env.SEED_PASSWORD) throw new Error('Set SEED_PASSWORD in server/.env.test for the E2E demo accounts.');
    return env;
  } finally {
    process.chdir(previous);
  }
}
