import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { setCsrfToken } from '../src/api';
import { RosterPanel } from '../src/roster/RosterPanel';

// F-09 check-in from the owner roster (Sprint 3, T-37/T-38 UI).
const checkedInAt = '2099-11-20T06:05:00Z';
const roster = (checked: string | null) => ({ event: { id: 7, title: 'Check-in workshop', capacity: 3 }, count: 2, items: [
  { id: 11, status: 'ACTIVE', registeredAt: '2026-11-06T01:00:00Z', checkedInAt: checked, participant: { id: 3, name: 'First Participant', email: 'first@example.test' } },
  { id: 12, status: 'CANCELLED', registeredAt: '2026-11-06T02:00:00Z', checkedInAt: null, participant: { id: 4, name: 'Second Participant', email: 'second@example.test' } },
] });
type Reply = { status: number; body: unknown };
let replies: Record<string, () => Promise<Reply>>;
let calls: { url: string; init: RequestInit }[];
beforeEach(() => {
  setCsrfToken('csrf');
  calls = [];
  replies = { 'GET /api/events/7/registrations': async () => ({ status: 200, body: roster(null) }) };
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const reply = await replies[`${init.method ?? 'GET'} ${url}`]();
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); setCsrfToken(null); });
const rowOf = (name: string) => screen.getByRole('cell', { name }).closest('tr')!;

test('Check in sends POST with CSRF, shows the saved Bangkok time, and a reload shows the same', async () => {
  let release!: () => void;
  replies['POST /api/registrations/11/check-in'] = () => new Promise((resolve) => {
    release = () => resolve({ status: 200, body: { ...roster(checkedInAt).items[0] } });
  });
  const view = render(<RosterPanel eventId={7} />);
  await screen.findByText('First Participant');
  expect(within(rowOf('Second Participant')).queryByRole('button', { name: /Check in/ })).not.toBeInTheDocument();
  fireEvent.click(within(rowOf('First Participant')).getByRole('button', { name: 'Check in First Participant' }));
  expect(await screen.findByRole('button', { name: 'Checking in...' })).toBeDisabled();
  expect(calls.find((c) => c.url === '/api/registrations/11/check-in')!.init.headers).toMatchObject({ 'X-CSRF-Token': 'csrf' });
  await act(async () => release());
  expect(within(rowOf('First Participant')).getByText('20 Nov 2099, 13:05')).toBeInTheDocument();
  expect(within(rowOf('First Participant')).queryByRole('button')).not.toBeInTheDocument();

  replies['GET /api/events/7/registrations'] = async () => ({ status: 200, body: roster(checkedInAt) });
  view.unmount();
  render(<RosterPanel eventId={7} />);
  expect(await screen.findByText('20 Nov 2099, 13:05')).toBeInTheDocument();
});

test('a rejected check-in shows the server message and reloads the roster', async () => {
  replies['POST /api/registrations/11/check-in'] = async () => ({ status: 409, body: { error: { code: 'CHECK_IN_CLOSED', message: 'Check-in is open from 1 hour before start until the event ends.', details: [] } } });
  render(<RosterPanel eventId={7} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Check in First Participant' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Check-in is open from 1 hour before start until the event ends.');
  expect(calls.filter((c) => c.url === '/api/events/7/registrations')).toHaveLength(2);
});
