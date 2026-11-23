import { expect, test } from '@playwright/test';
import { ApiServer } from '../support/api-server.ts';
import { localInput, login } from '../support/journey.ts';

// Lab 6 UAT findings from EN-020 T&T, checked in a real browser at both viewports.
//   #45 UAT-F-01: after publishing, a reload must not show "Event saved as draft".
//   #46 UAT-F-02: with a 120 character title, status badges in My events stay on one line.
test.describe.configure({ mode: 'serial' });

const api = new ApiServer();
test.beforeAll(async () => { await api.start(); });
test.afterAll(async () => { await api.stop(); });

test('UAT-F-01 (#45) and UAT-F-02 (#46): reload message and long title layout', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  const stamp = `${testInfo.project.name.slice(0, 1)}${Date.now()}`;
  const title = `UAT ${stamp} `.padEnd(120, 'B');
  const start = new Date(Date.now() + 3 * 86400000);
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 3600000);

  await login(page, 'organizer1@example.test');
  await page.getByRole('link', { name: 'Create event' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Location').fill('CB2301');
  await page.getByLabel('Start').fill(localInput(start));
  await page.getByLabel('End').fill(localInput(end));
  await page.getByLabel('Capacity').fill('5');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Event saved as draft')).toBeVisible();

  await page.getByRole('button', { name: 'Publish' }).click();
  await page.getByRole('button', { name: 'Confirm publish' }).click();
  await expect(page.getByText('Event published')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Published', { exact: true })).toBeVisible();
  await expect(page.getByText('Event saved as draft')).toHaveCount(0);

  await page.getByRole('link', { name: 'Back to My events' }).click();
  await expect(page.getByRole('link', { name: title })).toBeVisible();
  const badges = page.locator('.event-table .role-badge');
  const count = await badges.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    const lines = await badges.nth(i).evaluate((el) => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.2;
      return Math.round(el.getBoundingClientRect().height / lineHeight);
    });
    expect(lines, `badge ${i} wraps onto more than one line`).toBeLessThanOrEqual(1);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
