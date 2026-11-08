import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, type Page, type TestInfo } from '@playwright/test';

export const SEED_PASSWORD = () => {
  const password = process.env.E2E_SEED_PASSWORD;
  if (!password) throw new Error('E2E_SEED_PASSWORD missing: run through playwright.config.ts so global-setup runs.');
  return password;
};

export async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(SEED_PASSWORD());
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.getByRole('heading', { name: 'Log in to Event Planner' })).toBeVisible();
}

/** NFR-05: every page in the journey fits the viewport without horizontal scrolling. */
export async function expectNoOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
  expect(sizes.scroll, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(sizes.width);
}

/** Saves a screenshot as evidence in docs/evidence/sprint-1/issue7/<project>/. */
export async function evidence(page: Page, testInfo: TestInfo, name: string) {
  const dir = resolve(import.meta.dirname, '../../docs/evidence/sprint-1/issue7', testInfo.project.name);
  mkdirSync(dir, { recursive: true });
  await expectNoOverflow(page);
  await page.screenshot({ path: resolve(dir, `${name}.png`), fullPage: true });
}

/** Value for a datetime-local input, in the machine's local time. */
export function localInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
