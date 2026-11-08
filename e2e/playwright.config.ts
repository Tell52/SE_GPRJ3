import { defineConfig } from '@playwright/test';

// Browser: installed Google Chrome by default (as in the #4 and #6 smoke runs).
// Without Chrome, run `npx playwright install chromium` once and set PW_CHANNEL=chromium.
const browser = process.env.PW_EXECUTABLE_PATH
  ? { launchOptions: { executablePath: process.env.PW_EXECUTABLE_PATH } }
  : { channel: process.env.PW_CHANNEL ?? 'chrome' };

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  // One worker: the journey restarts the shared API process and both projects use the same test database.
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  // Fail fast with a clear message instead of waiting for the whole test timeout.
  use: { baseURL: 'http://127.0.0.1:5173', actionTimeout: 15000, ...browser },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
  // The client only. The test starts and restarts the API itself (support/api-server.ts).
  webServer: {
    command: 'npm run dev --workspace client -- --host 127.0.0.1 --port 5173 --strictPort',
    cwd: '..',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
