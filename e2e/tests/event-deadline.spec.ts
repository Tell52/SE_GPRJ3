import { expect, test } from '@playwright/test';
import { ApiServer } from '../support/api-server.ts';
import { login } from '../support/journey.ts';

const api = new ApiServer();
test.beforeAll(async () => { await api.start(); });
test.afterAll(async () => { await api.stop(); });

test('T-27: a closed custom deadline keeps the upcoming event visible and removes Register', async ({ page, browser }) => {
  await login(page, 'organizer1@example.test');
  await page.getByRole('link', { name: 'Introduction to Git' }).click();
  await page.getByRole('link', { name: 'Edit event' }).click();
  const field = page.getByLabel('Registration deadline (optional)');
  await field.fill('2020-01-01T09:00');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Event updated')).toBeVisible();
  const participant = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: page.viewportSize() });
  try {
    await login(participant, 'participant2@example.test');
    await participant.getByRole('link', { name: 'Introduction to Git' }).click();
    await expect(participant.getByText('Registration for this event is closed.')).toBeVisible();
    await expect(participant.getByRole('button', { name: 'Register', exact: true })).toHaveCount(0);
  } finally {
    await participant.close();
    await page.getByRole('link', { name: 'Edit event' }).click();
    await field.fill('');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Event updated')).toBeVisible();
  }
});

test('T-24: organizer can set, update and clear a deadline across reloads', async ({ page }) => {
  await login(page, 'organizer1@example.test');
  await page.getByRole('link', { name: 'Introduction to Git' }).click();
  await page.getByRole('link', { name: 'Edit event' }).click();
  const field = page.getByLabel('Registration deadline (optional)');
  const start = await page.getByLabel('Start', { exact: true }).inputValue();
  const earlier = new Date(Date.parse(start + ':00Z') - 7200000).toISOString().slice(0, 16);
  for (const deadline of [earlier, start, '']) {
    await field.fill(deadline);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Event updated')).toBeVisible();
    await page.getByRole('link', { name: 'Edit event' }).click();
    await page.reload();
    await expect(field).toHaveValue(deadline);
  }
});
