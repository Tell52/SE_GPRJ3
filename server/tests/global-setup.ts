import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { loadTestEnvironment } from './helpers/test-database.js';

// Applies committed migrations to the dedicated test database once, before any test file runs,
// so suites do not depend on file order. The guard in loadTestEnvironment rejects any other database.
export default function setup() {
  const env = loadTestEnvironment();
  const require = createRequire(import.meta.url);
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
    env, cwd: process.cwd(), stdio: 'pipe', timeout: 60000,
  });
}
