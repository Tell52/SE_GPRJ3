// Run from the repository root after npm run build and npm test, serially with other DB tests.
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
process.chdir(resolve(root, 'server'));
const { loadTestEnvironment } = await import('../../server/tests/helpers/test-database.ts');
const env = loadTestEnvironment();
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.NODE_ENV = 'test';
const { prisma } = await import('../../server/dist/src/db.js');
const { createApp } = await import('../../server/dist/src/app.js');
const { createUser, resetTables, TEST_PASSWORD } = await import('../../server/tests/helpers/api.ts');
const evidence = resolve(root, 'docs/evidence/sprint-1');
await mkdir(evidence, { recursive: true });
let api, vite, browser;
try {
  await resetTables(prisma);
  await createUser(prisma, 'ORGANIZER', 'smoke-organizer');
  await createUser(prisma, 'PARTICIPANT', 'smoke-participant');
  api = await new Promise((resolve, reject) => {
    const server = createApp().listen(3000, '127.0.0.1', () => resolve(server));
    server.once('error', reject);
  });
  vite = await createServer({ root: resolve(root, 'client'), configFile: resolve(root, 'client/vite.config.ts'), server: { host: '127.0.0.1', port: 5173, strictPort: true } });
  await vite.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    const capture = async (step) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: resolve(evidence, `issue4-${name}-${step}.png`), fullPage: true });
    };
    const login = async (email) => {
      await page.getByLabel('Email', { exact: true }).fill(email);
      await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
    };
    await page.goto('http://127.0.0.1:5173');
    await login('smoke-organizer@example.test');
    await page.getByRole('link', { name: 'Create event', exact: true }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByLabel('Title', { exact: true })).toBeFocused();
    await capture('validation');
    const title = `Issue 4 ${name} workshop`;
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page.getByLabel('Description', { exact: true }).fill('Create, publish and discover a workshop.');
    await page.getByLabel('Location', { exact: true }).fill('CB2301');
    await page.getByLabel('Start', { exact: true }).fill('2099-11-20T14:00');
    await page.getByLabel('End', { exact: true }).fill('2099-11-20T16:00');
    await page.getByLabel('Capacity', { exact: true }).fill('10');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Event saved as draft', { exact: true })).toBeVisible();
    await capture('draft');
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm publish', exact: true }).click();
    await expect(page.getByText('Event published', { exact: true })).toBeVisible();
    await capture('published');
    await page.getByRole('link', { name: 'Back to My events', exact: true }).click();
    await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
    await capture('mine');
    await page.getByRole('button', { name: 'Logout', exact: true }).click();
    await login('smoke-participant@example.test');
    await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
    await capture('discovery');
    await page.getByRole('link', { name: title, exact: true }).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish', exact: true })).toHaveCount(0);
    await capture('detail');
    expect(consoleErrors).toEqual([]);
    console.log(`PASS ${name} ${viewport.width}x${viewport.height}: create, publish, My events, logout, participant discovery/detail; no overflow or page errors.`);
    await context.close();
  }
  expect(await prisma.event.count({ where: { status: 'PUBLISHED' } })).toBe(2);
  console.log('PASS PostgreSQL: both created events persisted as PUBLISHED.');
} finally {
  await browser?.close();
  await vite?.close();
  if (api) await new Promise((resolve, reject) => api.close((error) => error ? reject(error) : resolve()));
  await resetTables(prisma);
  await prisma.$disconnect();
  process.chdir(root);
}
