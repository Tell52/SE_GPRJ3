import { expect, test, type Browser, type Page } from '@playwright/test';
import { ApiServer } from '../support/api-server.ts';
import { evidence, expectNoOverflow, localInput, login, logout } from '../support/journey.ts';

// T-18 / AC-18: the complete Sprint 1 journey through the real UI, real API process and real PostgreSQL.
// Runs once per project (desktop 1440x900, mobile 390x844). Each run uses its own capacity 1 event.
test.describe.configure({ mode: 'serial' });

const api = new ApiServer();
test.beforeAll(async () => { await api.start(); });
test.afterAll(async () => { await api.stop(); });

async function userPage(browser: Browser, testInfo: Parameters<Parameters<typeof test>[1]>[1]): Promise<Page> {
  const context = await browser.newContext({ viewport: testInfo.project.use.viewport, baseURL: testInfo.project.use.baseURL });
  return context.newPage();
}

test('T-18 / AC-18: publish, register, rejections, roster and restart persistence', async ({ browser }, testInfo) => {
  test.setTimeout(180000);
  const title = `E2E ${testInfo.project.name} workshop ${Date.now()}`;
  const start = new Date(Date.now() + 3 * 86400000);
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 2 * 3600000);
  let eventPath = '';

  await test.step('organizer1 creates and publishes a capacity 1 event, then logs out', async () => {
    const organizer = await userPage(browser, testInfo);
    await login(organizer, 'organizer1@example.test');
    await expect(organizer.getByRole('heading', { name: 'My events' })).toBeVisible();
    await organizer.getByRole('link', { name: 'Create event' }).click();
    await organizer.getByLabel('Title').fill(title);
    await organizer.getByLabel('Description').fill('End to end check of the Sprint 1 journey.');
    await organizer.getByLabel('Location').fill('CB2301');
    await organizer.getByLabel('Start').fill(localInput(start));
    await organizer.getByLabel('End').fill(localInput(end));
    await organizer.getByLabel('Capacity').fill('1');
    await evidence(organizer, testInfo, '01-create-form');
    await organizer.getByRole('button', { name: 'Save' }).click();

    await expect(organizer.getByRole('heading', { name: title })).toBeVisible();
    await expect(organizer.getByText('Draft', { exact: true })).toBeVisible();
    eventPath = new URL(organizer.url()).pathname.replace('/organizer', '');
    await organizer.getByRole('button', { name: 'Publish' }).click();
    await organizer.getByRole('button', { name: 'Confirm publish' }).click();
    await expect(organizer.getByText('Published', { exact: true })).toBeVisible();
    await expect(organizer.getByText('No registrations yet')).toBeVisible();
    await evidence(organizer, testInfo, '02-published');
    await logout(organizer);
    await organizer.context().close();
  });

  // participant2 opens the event while one place is left and keeps the page open.
  const participant2 = await userPage(browser, testInfo);
  await test.step('participant2 discovers the event with 1 place left', async () => {
    await login(participant2, 'participant2@example.test');
    await participant2.getByRole('link', { name: title }).click();
    await expect(participant2.getByText('1 place left')).toBeVisible();
    await expect(participant2.getByRole('button', { name: 'Register' })).toBeVisible();
    await expectNoOverflow(participant2);
  });

  // participant1 has the same event open in two tabs: one to register, one left stale for the duplicate attempt.
  const participant1 = await userPage(browser, testInfo);
  const participant1Stale = await participant1.context().newPage();
  await test.step('participant1 registers and opens the saved registration', async () => {
    await login(participant1, 'participant1@example.test');
    await participant1Stale.goto(eventPath);
    await expect(participant1Stale.getByRole('button', { name: 'Register' })).toBeVisible();

    await participant1.goto(eventPath);
    await participant1.getByRole('button', { name: 'Register' }).click();
    await expect(participant1.getByText('You are registered')).toBeVisible();
    await expect(participant1.getByRole('heading', { name: title })).toBeVisible();
    await expect(participant1.getByText('Registration number')).toBeVisible();
    await evidence(participant1, testInfo, '03-receipt');

    await participant1.getByRole('link', { name: 'Back to My registrations' }).click();
    await expect(participant1.getByRole('link', { name: title })).toBeVisible();
    await evidence(participant1, testInfo, '04-my-registrations');
  });

  await test.step('participant1 registering again sees the duplicate message', async () => {
    await participant1Stale.getByRole('button', { name: 'Register' }).click();
    await expect(participant1Stale.getByRole('alert')).toHaveText('You are already registered for this event.');
    await expect(participant1Stale.getByText('You are registered')).toBeVisible();
    await expect(participant1Stale.getByText('Full', { exact: true })).toBeVisible();
    await expect(participant1Stale.getByRole('button', { name: 'Register' })).toHaveCount(0);
    await evidence(participant1Stale, testInfo, '05-duplicate');
  });

  await test.step('participant2 is too late: full message, then Full with no Register button', async () => {
    await participant2.getByRole('button', { name: 'Register' }).click();
    await expect(participant2.getByRole('alert')).toHaveText('Sorry, this event just filled up.');
    await expect(participant2.getByText('Full', { exact: true })).toBeVisible();
    await expect(participant2.getByRole('button', { name: 'Register' })).toHaveCount(0);
    await evidence(participant2, testInfo, '06-full-message');

    await participant2.reload();
    await expect(participant2.getByText('Full', { exact: true })).toBeVisible();
    await expect(participant2.getByRole('button', { name: 'Register' })).toHaveCount(0);
    await participant2.goto('/registrations');
    await expect(participant2.getByText('You have not registered for any events')).toBeVisible();
    await logout(participant2);
    await logout(participant1);
    await participant1.context().close();
    await participant2.context().close();
  });

  await test.step('organizer1 sees participant1 in the roster and logs out', async () => {
    const organizer = await userPage(browser, testInfo);
    await login(organizer, 'organizer1@example.test');
    await organizer.getByRole('link', { name: title }).click();
    await expect(organizer.getByText('1 of 1 places taken')).toBeVisible();
    const roster = organizer.getByRole('table', { name: 'Event registrations' });
    await expect(roster.getByText('Participant One')).toBeVisible();
    await expect(roster.getByText('participant1@example.test')).toBeVisible();
    await expect(roster.getByText('Participant Two')).toHaveCount(0);
    await evidence(organizer, testInfo, '07-roster');
    await logout(organizer);
    await organizer.context().close();
  });

  await test.step('after an API restart, participant1 still has the registration', async () => {
    const pidBefore = api.pid;
    await api.restart();
    expect(api.pid).toBeDefined();
    expect(api.pid).not.toBe(pidBefore);

    const participant = await userPage(browser, testInfo);
    await login(participant, 'participant1@example.test');
    await participant.goto('/registrations');
    await expect(participant.getByRole('link', { name: title }), 'registration missing after restart').toBeVisible();
    await participant.getByRole('link', { name: title }).click();
    await expect(participant.getByRole('heading', { name: title })).toBeVisible();
    await expect(participant.getByText('Registration number')).toBeVisible();
    await evidence(participant, testInfo, '08-after-restart');
    await logout(participant);
    await participant.context().close();
  });
});
