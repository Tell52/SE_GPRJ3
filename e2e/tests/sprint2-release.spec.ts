import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { ApiServer } from '../support/api-server.ts';
import { login } from '../support/journey.ts';

const api = new ApiServer();
test.beforeAll(async () => { await api.start(); });
test.afterAll(async () => { await api.stop(); });

test('demo A: retrieve a cancelled receipt and reject repeat cancellation', async ({ page }, info) => {
  await login(page, 'participant3@example.test');
  await page.getByRole('link', { name: 'Introduction to Git' }).click();
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page.getByText('Registration number')).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cancel registration' }).click();
  await expect(page.getByText('Cancelled by participant')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Cancelled by participant')).toBeVisible();
  const path = '/api' + new URL(page.url()).pathname;
  const read = await page.request.get(path);
  expect(read.status()).toBe(200);
  const { id, status, cancelledBy, cancelledAt } = await read.json();
  expect(status).toBe('CANCELLED');
  const { csrfToken } = await (await page.request.get('/api/auth/me')).json();
  const repeat = await page.request.post(path + '/cancel', { headers: { 'X-CSRF-Token': csrfToken } });
  const { error } = await repeat.json();
  expect(repeat.status()).toBe(409);
  expect(error.code).toBe('INVALID_STATE');
  await page.screenshot({ path: info.outputPath('receipt.png') });
  await writeFile(info.outputPath('receipt.json'), JSON.stringify({
    read: { path, httpStatus: read.status(), id, status, cancelledBy, cancelledAt },
    repeat: { httpStatus: repeat.status(), code: error.code },
  }, null, 2));
});

test('demo B: retrieve a saved edit and reject a different organizer at the API', async ({ page, browser }, info) => {
  await login(page, 'organizer1@example.test');
  await page.getByRole('link', { name: 'Introduction to Git' }).click();
  await page.getByRole('link', { name: 'Edit event' }).click();
  const field = page.getByLabel('Location');
  const original = await field.inputValue();
  const id = new URL(page.url()).pathname.split('/').at(-2);
  const location = 'Sprint 2 demo room';
  await field.fill(location);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Event updated')).toBeVisible();
  const other = await browser.newPage({ baseURL: 'http://127.0.0.1:5173' });
  try {
    await login(other, 'organizer2@example.test');
    const { csrfToken } = await (await other.request.get('/api/auth/me')).json();
    const path = `/api/events/${id}`;
    const denied = await other.request.patch(path, {
      headers: { 'X-CSRF-Token': csrfToken }, data: { location: 'Other room' },
    });
    const { error } = await denied.json();
    expect(denied.status()).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    await page.getByRole('link', { name: 'Edit event' }).click();
    await page.reload();
    await expect(field).toHaveValue(location);
    await page.screenshot({ path: info.outputPath('saved-edit.png') });
    await writeFile(info.outputPath('saved-edit.json'), JSON.stringify({
      request: { path, method: 'PATCH', role: 'non-owner organizer' },
      rejected: { httpStatus: denied.status(), code: error.code }, ownerReload: { location: await field.inputValue() },
    }, null, 2));
    await field.fill(original);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Event updated')).toBeVisible();
  } finally {
    await other.close();
  }
});
