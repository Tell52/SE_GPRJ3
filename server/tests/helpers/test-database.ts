import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';

export function assertTestDatabase(testUrl: string, developmentUrl?: string) {
  const url = new URL(testUrl);
  if (!['postgresql:', 'postgres:'].includes(url.protocol) ||
      decodeURIComponent(url.pathname) !== '/event_planner_test' ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      (url.searchParams.has('schema') && url.searchParams.get('schema') !== 'public')) {
    throw new Error('Tests require a local, dedicated event_planner_test database with the public schema.');
  }
  if (developmentUrl) {
    const dev = new URL(developmentUrl);
    // Treat local host aliases alike. Credentials/schema do not isolate a database.
    const local = (host: string) => ['localhost', '127.0.0.1', '[::1]'].includes(host) ? 'loopback' : host;
    if (local(dev.hostname) === local(url.hostname) &&
        (dev.port || '5432') === (url.port || '5432') &&
        decodeURIComponent(dev.pathname) === decodeURIComponent(url.pathname)) {
      throw new Error('Refusing to reset the development database.');
    }
  }
  return testUrl;
}

export function loadTestEnvironment() {
  // Explicit file only: never fall back to the shell or development DATABASE_URL.
  const test = parse(readFileSync('.env.test'));
  let development: Record<string, string> = {};
  try { development = parse(readFileSync('.env')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  assertTestDatabase(test.DATABASE_URL, development.DATABASE_URL);
  if (!test.SEED_PASSWORD || test.SEED_PASSWORD.startsWith('replace_with_')) {
    throw new Error('Set a local SEED_PASSWORD in server/.env.test.');
  }
  return { ...process.env, ...test, NODE_ENV: 'test' };
}
