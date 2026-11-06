// Run serially with other DB tests: node --import tsx e2e/scripts/issue6-smoke.mjs
import { chromium, expect, request } from '@playwright/test';
import { createServer } from 'vite';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
process.chdir(resolve(root, 'server'));
const { loadTestEnvironment } = await import('../../server/tests/helpers/test-database.ts');
process.env.DATABASE_URL = loadTestEnvironment().DATABASE_URL;
process.env.NODE_ENV = 'test';
const { prisma } = await import('../../server/dist/src/db.js');
const { createApp } = await import('../../server/dist/src/app.js');
const { createUser, resetTables, TEST_PASSWORD } = await import('../../server/tests/helpers/api.ts');
const evidence = resolve(root, 'docs/evidence/sprint-1');
const contexts = [];
let api, vite, browser;
try {
  await resetTables(prisma);
  const owner = await createUser(prisma, 'ORGANIZER', 'roster-owner');
  await createUser(prisma, 'ORGANIZER', 'roster-foreign');
  await createUser(prisma, 'PARTICIPANT', 'roster-participant-one');
  await createUser(prisma, 'PARTICIPANT', 'roster-participant-two-with-a-long-email-for-mobile');
  const data = { organizerId: owner.id, title: 'Issue 6 private roster', location: 'CB2301', capacity: 3,
    startsAt: new Date('2099-11-20T07:00:00Z'), endsAt: new Date('2099-11-20T09:00:00Z') };
  const event = await prisma.event.create({ data: { ...data, status: 'PUBLISHED', publishedAt: new Date() } });
  const empty = await prisma.event.create({ data: { ...data, title: 'Issue 6 empty roster' } });
  api = await new Promise((resolve, reject) => {
    const server = createApp().listen(3000, '127.0.0.1', () => resolve(server));
    server.once('error', reject);
  });
  const login = async (label) => {
    const context = await request.newContext({ baseURL: 'http://127.0.0.1:3000' });
    contexts.push(context);
    const response = await context.post('/api/auth/login', { data: { email: `${label}@example.test`, password: TEST_PASSWORD } });
    expect(response.status()).toBe(200);
    return { context, csrfToken: (await response.json()).csrfToken };
  };
  const ownerApi = await login('roster-owner');
  const foreignApi = await login('roster-foreign');
  const p1 = await login('roster-participant-one');
  const p2 = await login('roster-participant-two-with-a-long-email-for-mobile');
  for (const p of [p1, p2]) {
    const response = await p.context.post(`/api/events/${event.id}/registrations`, { headers: { 'X-CSRF-Token': p.csrfToken } });
    expect(response.status()).toBe(201);
  }
  const anonymous = await request.newContext({ baseURL: 'http://127.0.0.1:3000' }); contexts.push(anonymous);
  const apiEvidence = [];
  for (const [role, context, status] of [['owner', ownerApi.context, 200], ['anonymous', anonymous, 401], ['participant', p1.context, 403], ['foreign organizer', foreignApi.context, 404]]) {
    const response = await context.get(`/api/events/${event.id}/registrations`);
    const body = await response.json();
    expect(response.status()).toBe(status);
    if (status === 200) { expect(body.count).toBe(2); expect(body.items).toHaveLength(2); }
    else { expect(Object.keys(body)).toEqual(['error']); expect(JSON.stringify(body)).not.toMatch(/roster-participant|password|token/i); }
    apiEvidence.push({ role, status: response.status(), body });
  }
  await writeFile(resolve(evidence, 'issue6-api.json'), JSON.stringify(apiEvidence, null, 2) + '\n');
  vite = await createServer({ root: resolve(root, 'client'), configFile: resolve(root, 'client/vite.config.ts'), server: { host: '127.0.0.1', port: 5173, strictPort: true } });
  await vite.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    const capture = async (step) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: resolve(evidence, `issue6-${name}-${step}.png`), fullPage: true });
    };
    await page.goto('http://127.0.0.1:5173');
    await page.getByLabel('Email', { exact: true }).fill('roster-owner@example.test');
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await page.getByRole('link', { name: event.title, exact: true }).click();
    await expect(page.getByText('2 of 3 places taken', { exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: /roster-participant-one@example\.test/ })).toBeVisible();
    expect(await page.locator('.roster-table tbody tr').count()).toBe(2);
    expect(await page.locator('.roster-table caption').evaluate((element) => element.getBoundingClientRect().height)).toBeLessThan(60);
    await capture('roster');
    await page.getByRole('link', { name: 'Back to My events', exact: true }).click();
    await page.getByRole('link', { name: empty.title, exact: true }).click();
    await expect(page.getByText('No registrations yet', { exact: true })).toBeVisible();
    await capture('empty');
    await page.route(`**/api/events/${empty.id}/registrations`, (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } }) }));
    await page.reload();
    await expect(page.getByRole('alert')).toContainText('An unexpected error occurred.');
    await capture('error');
    await page.unroute(`**/api/events/${empty.id}/registrations`);
    await page.getByRole('button', { name: 'Retry roster' }).click();
    await expect(page.getByText('No registrations yet')).toBeVisible();
    await page.getByRole('button', { name: 'Logout', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Roster', exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
    console.log(`PASS ${name} ${viewport.width}x${viewport.height}: My events to roster, empty, simulated error/retry, logout, no overflow or page errors.`);
    await context.close();
  }
  console.log('PASS real PostgreSQL/API: two saved registrations; owner 200, anonymous 401, participant 403, foreign organizer 404. Sanitized response evidence saved.');
} finally {
  await browser?.close();
  for (const context of contexts) await context.dispose();
  await vite?.close();
  if (api) await new Promise((resolve, reject) => api.close((error) => error ? reject(error) : resolve()));
  await resetTables(prisma); await prisma.$disconnect(); process.chdir(root);
}
