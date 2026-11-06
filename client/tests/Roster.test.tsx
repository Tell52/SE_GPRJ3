import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from '../src/App';
import { RosterPanel } from '../src/roster/RosterPanel';

const event = { id: 7, title: 'Roster workshop', description: '', location: 'Room 1', startsAt: '2099-11-20T07:00:00Z', endsAt: '2099-11-20T09:00:00Z', capacity: 3, activeCount: 2, remainingPlaces: 1, status: 'PUBLISHED', organizer: { id: 1, name: 'Owner' } };
const roster = { event: { id: 7, title: event.title, capacity: 3 }, count: 2, items: [
  { id: 11, status: 'ACTIVE', registeredAt: '2026-11-06T01:00:00Z', participant: { id: 3, name: 'First Participant', email: 'first@example.test' } },
  { id: 12, status: 'ACTIVE', registeredAt: '2026-11-06T02:00:00Z', participant: { id: 4, name: 'Second Participant', email: 'second@example.test' } },
] };
type Reply = { status: number; body: unknown };
let role: string;
let ownerId: number;
let reply: () => Promise<Reply>;
let calls: string[];
beforeEach(() => {
  role = 'ORGANIZER'; ownerId = 1; calls = [];
  reply = async () => ({ status: 200, body: roster });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    calls.push(url);
    const response = url.endsWith('/registrations') ? await reply() : { status: 200, body:
      url === '/api/auth/me' ? { user: { id: ownerId, name: 'Owner', email: 'owner@example.test', role }, csrfToken: 'csrf' } :
      url === '/api/events/mine' ? { items: [event] } : event };
    return new Response(JSON.stringify(response.body), { status: response.status });
  }));
});
afterEach(() => vi.unstubAllGlobals());
const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

test('T-16: My events links to the owner roster with ordered stored fields and count', async () => {
  renderAt('/organizer/events');
  fireEvent.click(await screen.findByRole('link', { name: event.title }));
  expect(await screen.findByText('2 of 3 places taken')).toBeInTheDocument();
  const table = screen.getByRole('table', { name: 'Event registrations' });
  const rows = within(table).getAllByRole('row');
  expect(rows).toHaveLength(3);
  expect(rows[1]).toHaveTextContent('11First Participantfirst@example.testACTIVE');
  expect(rows[2]).toHaveTextContent('12Second Participantsecond@example.testACTIVE');
  expect(rows[1].querySelector('time')).toHaveAttribute('dateTime', roster.items[0].registeredAt);
});
test('T-16: empty roster shows zero and the explicit empty state', async () => {
  reply = async () => ({ status: 200, body: { ...roster, count: 0, items: [] } });
  render(<RosterPanel eventId={7} />);
  expect(await screen.findByText('No registrations yet')).toBeInTheDocument();
  expect(screen.getByText('0 of 3 places taken')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});
test('loading is visible; a network error can be retried', async () => {
  let reject!: (error: Error) => void;
  reply = () => new Promise((_resolve, fail) => { reject = fail; });
  render(<RosterPanel eventId={7} />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  await act(async () => reject(new TypeError('network')));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server. Try again.');
  expect(screen.queryByText('No registrations yet')).not.toBeInTheDocument();
  reply = async () => ({ status: 200, body: roster });
  fireEvent.click(screen.getByRole('button', { name: 'Retry roster' }));
  expect(await screen.findByText('first@example.test')).toBeInTheDocument();
});
test.each([401, 403, 404, 500])('API error %s displays an alert without participant data', async (status) => {
  reply = async () => ({ status, body: { error: { code: 'ERROR', message: 'Request denied' } } });
  render(<RosterPanel eventId={7} />);
  expect(await screen.findByRole('alert')).toHaveTextContent(status === 404 ? 'Event not found' : 'Request denied');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});
test.each(['public', 'participant', 'foreign'])('%s route does not request private roster data', async (scenario) => {
  if (scenario === 'participant') role = 'PARTICIPANT';
  if (scenario === 'foreign') ownerId = 9;
  renderAt(scenario === 'foreign' ? '/organizer/events/7' : '/events/7');
  if (scenario === 'foreign') await screen.findByText('Event not found');
  else await screen.findByRole('heading', { name: event.title });
  expect(screen.queryByRole('heading', { name: 'Roster' })).not.toBeInTheDocument();
  expect(calls.some((url) => url.endsWith('/registrations'))).toBe(false);
});
test('changing event discards a late response from the previous event', async () => {
  let resolveOld!: (reply: Reply) => void;
  reply = () => new Promise((resolve) => { resolveOld = resolve; });
  const view = render(<RosterPanel eventId={7} />);
  reply = async () => ({ status: 200, body: { ...roster, event: { ...roster.event, id: 8 }, count: 0, items: [] } });
  view.rerender(<RosterPanel eventId={8} />);
  await screen.findByText('No registrations yet');
  await act(async () => resolveOld({ status: 200, body: roster }));
  expect(screen.queryByText('first@example.test')).not.toBeInTheDocument();
});
