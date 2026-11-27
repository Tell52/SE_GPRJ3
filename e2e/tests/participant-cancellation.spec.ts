import { expect, test } from '@playwright/test';
import { ApiServer } from '../support/api-server.ts';
import { login } from '../support/journey.ts';

const api = new ApiServer();
test.beforeAll(async () => { await api.start(); });
test.afterAll(async () => { await api.stop(); });

test('T-20: cancel a saved receipt, reload it and see the freed place', async ({ page }) => {
  await login(page, 'participant1@example.test');
  await page.getByRole('link', { name: 'Introduction to Git' }).click();
  const places = page.getByText(/^\d+ places left$/);
  const beforeBooking = await places.innerText();
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page.getByText('Registration number')).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cancel registration' }).click();
  await expect(page.getByText('Cancelled by participant')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Cancelled by participant')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel registration' })).toHaveCount(0);
  await page.getByRole('link', { name: 'View event' }).click();
  await expect(places).toHaveText(beforeBooking);
  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeEnabled();
});
