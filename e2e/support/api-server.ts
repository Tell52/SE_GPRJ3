import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { e2eEnvironment, SERVER_DIR } from './test-env.ts';

export const API_PORT = 3000; // client/vite.config.ts proxies /api here
const API_URL = `http://127.0.0.1:${API_PORT}`;

async function portInUse() {
  try {
    await fetch(`${API_URL}/api/auth/me`, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs the real built API (server/dist/src/index.js) as its own process against the test database,
 * so the journey can stop and start it to prove data survives a restart (AC-18, NFR-03).
 */
export class ApiServer {
  private child: ChildProcess | null = null;
  starts = 0;

  /** Operating system process id of the running API, used to prove a restart created a new process. */
  get pid() { return this.child?.pid; }

  async start() {
    if (await portInUse()) {
      throw new Error(`Port ${API_PORT} is already in use. Stop "npm run dev:server" (or anything on ${API_PORT}) before running E2E tests.`);
    }
    const child = spawn(process.execPath, [resolve(SERVER_DIR, 'dist/src/index.js')], {
      cwd: SERVER_DIR,
      env: { ...e2eEnvironment(), PORT: String(API_PORT), NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.child = child;
    await new Promise<void>((ready, fail) => {
      let output = '';
      const timer = setTimeout(() => fail(new Error(`API did not start within 30 s:\n${output}`)), 30000);
      const onData = (chunk: Buffer) => {
        output += chunk.toString();
        if (output.includes('API listening')) { clearTimeout(timer); ready(); }
      };
      child.stdout!.on('data', onData);
      child.stderr!.on('data', onData);
      child.once('exit', (code) => { clearTimeout(timer); fail(new Error(`API exited with code ${code} before listening:\n${output}`)); });
    });
    this.starts += 1;
  }

  async stop() {
    const child = this.child;
    if (!child || child.exitCode !== null) return;
    const exited = new Promise((done) => child.once('exit', done));
    child.kill('SIGTERM');
    await exited;
    this.child = null;
    // Make sure the port is really free before the next start.
    for (let i = 0; i < 50 && await portInUse(); i += 1) await new Promise((r) => setTimeout(r, 100));
  }

  async restart() {
    await this.stop();
    await this.start();
  }
}
