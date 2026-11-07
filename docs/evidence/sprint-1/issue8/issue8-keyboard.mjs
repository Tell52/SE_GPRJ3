import { chromium, expect } from '@playwright/test';
import { ApiServer } from '../support/api-server.ts';
import { e2eEnvironment } from '../support/test-env.ts';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Assistant-operated keyboard walkthrough. No click(), fill(), focus(), or DOM mutation.
const output = resolve(process.argv[2]);
mkdirSync(output, { recursive: true });
const api = new ApiServer();
const vite = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { cwd: resolve('client'), stdio: 'ignore' });
const records = [];
let browser;
try {
  await api.start();
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:5173')).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  browser = await chromium.launch({ channel: 'chrome' });
  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, locale: 'en-US', timezoneId: 'Asia/Bangkok' });
    const page = await context.newPage();
    const row = { viewport: name, size: viewport, steps: [], focus: [], result: 'running' };
    records.push(row);
    const snapshot = async (label) => {
      const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
      expect(sizes.scroll).toBeLessThanOrEqual(sizes.width);
      await page.screenshot({ path: resolve(output, `${name}-${label}.png`), fullPage: true });
      row.steps.push(label);
    };
    const tabTo = async (target, reverse = false) => {
      await expect(target).toBeVisible();
      for (let i = 0; i < 90; i++) {
        if (await target.evaluate(el => el === document.activeElement)) {
          const focus = await target.evaluate(el => ({ tag: el.tagName, label: el.labels?.[0]?.textContent ?? el.textContent, outline: getComputedStyle(el).outline, visible: el.matches(':focus-visible') }));
          expect(focus.visible).toBe(true);
          expect(focus.outline).not.toContain('none');
          row.focus.push(focus);
          return;
        }
        await page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab');
      }
      throw new Error('Target unreachable by keyboard: ' + await target.textContent());
    };
    const activate = async (role, label, key = 'Enter') => {
      await tabTo(page.getByRole(role, { name: label, exact: true }));
      await page.keyboard.press(key);
    };
    const input = async (label, text) => {
      await tabTo(page.getByLabel(label, { exact: true }));
      await page.keyboard.press('Control+A');
      await page.keyboard.type(text);
    };
    const login = async (email) => {
      await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
      await input('Email', email);
      await input('Password', e2eEnvironment().SEED_PASSWORD);
      await activate('button', 'Log in');
      await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    };
    const logout = async () => {
      await activate('button', 'Logout', 'Space');
      await expect(page.getByRole('heading', { name: 'Log in to Event Planner' })).toBeVisible();
    };
    await page.goto('http://127.0.0.1:5173/login');
    await tabTo(page.getByLabel('Email', { exact: true }));
    await snapshot('01-login-focus');
    await tabTo(page.getByLabel('Password', { exact: true }));
    await tabTo(page.getByLabel('Email', { exact: true }), true);
    await activate('button', 'Log in');
    await expect(page.getByText('Email is required.')).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
    await snapshot('02-required-error');
    await login('organizer1@example.test');
    await activate('link', 'Create event');
    const title = `Keyboard ${name} ${Date.now()}`;
    await input('Title', title);
    await input('Description', 'Keyboard accessibility verification for Sprint 1.');
    await input('Location', 'CB2301');
    for (const label of ['Start', 'End']) {
      const field = page.getByLabel(label, { exact: true });
      await tabTo(field);
      for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowLeft');
      for (let segment = 0; segment < 6; segment++) {
        await page.keyboard.press('ArrowUp');
        if (segment === 2 || (segment === 3 && label === 'End')) await page.keyboard.press('ArrowUp');
        await page.keyboard.press('ArrowRight');
      }
      await snapshot(`date-${label}`);
      row.steps.push(`${label} entered: ${await field.inputValue()}`);
      expect(await field.inputValue()).not.toBe('');
    }
    await input('Capacity', '2');
    await snapshot('03-form');
    let releaseSave;
    const saveGate = new Promise(resolve => { releaseSave = resolve; });
    await page.route('**/api/events', async route => {
      if (route.request().method() === 'POST') await saveGate;
      await route.continue();
    });
    await activate('button', 'Save');
    try {
      await expect(page.getByRole('button', { name: 'Saving...' })).toBeDisabled();
      await snapshot('03b-busy');
    } finally { releaseSave(); }
    await expect(page.getByText('Event saved as draft')).toBeVisible();
    await page.unroute('**/api/events');
    await expect(page.getByText('No registrations yet')).toBeVisible();
    await snapshot('04-draft-empty');
    await activate('button', 'Publish');
    await activate('button', 'Cancel', 'Space');
    await activate('button', 'Publish');
    await activate('button', 'Confirm publish');
    await expect(page.getByText('Event published', { exact: true })).toBeVisible();
    await snapshot('05-published');
    await logout();
    await login('participant3@example.test');
    await activate('link', title);
    await activate('button', 'Register', 'Space');
    await expect(page.getByText('Registration number')).toBeVisible();
    await expect(page.getByText('You are registered')).toBeVisible();
    await snapshot('06-receipt');
    await activate('link', 'Back to My registrations');
    await activate('link', title);
    await expect(page.getByText('Registration number')).toBeVisible();
    await logout();
    await login('organizer1@example.test');
    let releaseRoster;
    const rosterGate = new Promise(resolve => { releaseRoster = resolve; });
    let failRoster = true;
    await page.route('**/api/events/*/registrations', async route => {
      if (failRoster) { await rosterGate; await route.abort('failed'); }
      else await route.continue();
    });
    await activate('link', title);
    try {
      await expect(page.getByRole('status').filter({ hasText: 'Loading...' })).toBeVisible();
      await snapshot('07a-roster-loading');
    } finally { releaseRoster(); }
    await expect(page.getByRole('button', { name: 'Retry roster' })).toBeVisible();
    await snapshot('07b-roster-error');
    failRoster = false;
    await activate('button', 'Retry roster', 'Space');
    await expect(page.getByText('Participant Three')).toBeVisible();
    await expect(page.getByText('1 of 2 places taken')).toBeVisible();
    await snapshot('07-roster');
    await logout();
    row.result = 'pass';
    await context.close();
    console.log(`${name}: keyboard journey passed`);
  }
} catch (error) {
  records.push({ result: 'failed', error: String(error), stack: error.stack });
  process.exitCode = 1;
  console.error(error);
} finally {
  writeFileSync(resolve(output, 'keyboard-results.json'), JSON.stringify({ operator: 'Codex', method: 'Playwright keyboard input with visual evidence; not a human attestation', records }, null, 2));
  await browser?.close();
  await api.stop();
  vite.kill();
}
