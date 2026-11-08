import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from '../src/App';
import { validateEventForm } from '../src/events/model';

const organizer = { id: 1, name: 'Organizer One', email: 'org@example.test', role: 'ORGANIZER' };
const participant = { ...organizer, id: 2, role: 'PARTICIPANT' };
const event = { id: 7, title: 'Git workshop', description: 'Learn Git', location: 'Room 1', startsAt: '2099-11-20T07:00:00Z', endsAt: '2099-11-20T09:00:00Z', capacity: 10, activeCount: 0, remainingPlaces: 10, status: 'DRAFT', publishedAt: null, organizer: { id: 1, name: 'Organizer One' } };
type Reply = { status: number; body: unknown };
let routes: Record<string, Reply | (() => Promise<Reply>) | 'network-error'>;
let calls: { url: string; init: RequestInit }[];
beforeEach(() => {
  calls = [];
  routes = {
    'GET /api/auth/me': { status: 200, body: { user: organizer, csrfToken: 'csrf' } },
    'GET /api/events': { status: 200, body: { items: [] } },
    'GET /api/events/mine': { status: 200, body: { items: [] } },
    'GET /api/events/7': { status: 200, body: event },
    'GET /api/events/7/registrations': { status: 200, body: { event: { id: 7, title: event.title, capacity: 10 }, count: 0, items: [] } },
  };
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const route = routes[`${init.method ?? 'GET'} ${url}`];
    if (route === 'network-error' || !route) throw new TypeError('Failed to fetch');
    const reply = typeof route === 'function' ? await route() : route;
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  }));
});
afterEach(() => vi.unstubAllGlobals());
const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
async function fillForm() {
  await screen.findByLabelText('Title');
  fill('Title', 'Git workshop'); fill('Location', 'Room 1'); fill('Start', '2099-11-20T14:00'); fill('End', '2099-11-20T16:00'); fill('Capacity', '10');
}
describe('T-05 events UI and states', () => {
  test('create saves Bangkok time as UTC, navigates to draft and confirms publication', async () => {
    routes['POST /api/events'] = { status: 201, body: event };
    let release!: () => void;
    routes['POST /api/events/7/publish'] = () => new Promise((resolve) => {
      release = () => resolve({ status: 200, body: { ...event, status: 'PUBLISHED', publishedAt: '2099-11-19T00:00:00Z' } });
    });
    renderAt('/organizer/events/new'); await fillForm(); fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Event saved as draft')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    const create = calls.find((c) => c.url === '/api/events' && c.init.method === 'POST')!;
    expect(JSON.parse(create.init.body as string)).toMatchObject({ startsAt: '2099-11-20T07:00:00.000Z', endsAt: '2099-11-20T09:00:00.000Z', capacity: 10 });
    expect(create.init.headers).toMatchObject({ 'X-CSRF-Token': 'csrf' });
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(screen.getByText('Publish this event? Participants will be able to register.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(calls.some((c) => c.url.endsWith('/publish'))).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm publish' }));
    expect(await screen.findByRole('button', { name: 'Publishing...' })).toBeDisabled();
    await act(async () => release());
    expect(await screen.findByText('Event published')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });
  test('empty lists and participant discovery hide organizer controls', async () => {
    routes['GET /api/auth/me'] = { status: 200, body: { user: participant, csrfToken: 'csrf' } };
    renderAt('/events'); expect(await screen.findByText('No upcoming events')).toBeInTheDocument();
    expect(screen.queryByText('Create event')).not.toBeInTheDocument();
  });
  test('my events empty state offers creation', async () => {
    renderAt('/organizer/events'); expect(await screen.findByText('You have not created any events yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create event' })).toHaveAttribute('href', '/organizer/events/new');
  });
  test('lists show loading before cards with Full and detail link', async () => {
    let release!: () => void;
    routes['GET /api/events'] = () => new Promise((resolve) => { release = () => resolve({ status: 200, body: { items: [{ ...event, remainingPlaces: 0 }] } }); });
    renderAt('/events'); await screen.findByRole('heading', { name: 'Events' });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    await act(async () => release());
    expect(await screen.findByText('Full')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Git workshop' })).toHaveAttribute('href', '/events/7');
  });
  test('my events table shows status and registered count', async () => {
    routes['GET /api/events/mine'] = { status: 200, body: { items: [event] } };
    renderAt('/organizer/events'); expect(await screen.findByText('0 / 10')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Git workshop' })).toHaveAttribute('href', '/organizer/events/7');
  });
  test('validation focuses first error and avoids API insert', async () => {
    renderAt('/organizer/events/new'); await screen.findByLabelText('Title');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByLabelText('Title')).toHaveFocus();
    expect(screen.getByLabelText('Capacity')).toHaveAttribute('aria-describedby', 'capacity-error');
    expect(calls.some((c) => c.init.method === 'POST')).toBe(false);
  });
  test('server field errors appear and preserve input', async () => {
    routes['POST /api/events'] = { status: 400, body: { error: { code: 'VALIDATION_ERROR', message: 'Some fields are invalid.', details: [{ field: 'startsAt', message: 'Start must be in the future.' }] } } };
    renderAt('/organizer/events/new'); await fillForm(); fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Some fields are invalid.');
    expect(screen.getByLabelText('Start')).toHaveFocus();
    expect(screen.getByLabelText('Title')).toHaveValue('Git workshop');
  });
  test('save pending disables submit and network failure permits retry', async () => {
    let release!: () => void;
    routes['POST /api/events'] = () => new Promise((_resolve, reject) => { release = () => reject(new TypeError('network')); });
    renderAt('/organizer/events/new'); await fillForm(); fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('button', { name: 'Saving...' })).toBeDisabled();
    await act(async () => release());
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server. Try again.');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
  test('publish server failure leaves draft visible', async () => {
    routes['POST /api/events/7/publish'] = { status: 409, body: { error: { code: 'INVALID_STATE', message: 'Event already started.' } } };
    renderAt('/organizer/events/7'); fireEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm publish' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Event already started.');
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
  test('list server failure shows error instead of empty', async () => {
    routes['GET /api/events'] = { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } } };
    renderAt('/events'); expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
    expect(screen.queryByText('No upcoming events')).not.toBeInTheDocument();
  });
  test('404 detail shows Event not found', async () => {
    routes['GET /api/events/7'] = { status: 404, body: { error: { code: 'NOT_FOUND' } } };
    renderAt('/events/7'); expect(await screen.findByRole('alert')).toHaveTextContent('Event not found');
  });
  test('participant detail never offers publish or roster', async () => {
    routes['GET /api/auth/me'] = { status: 200, body: { user: participant, csrfToken: 'csrf' } };
    routes['GET /api/events/7'] = { status: 200, body: { ...event, status: 'PUBLISHED' } };
    renderAt('/events/7'); await screen.findByRole('heading', { name: 'Git workshop' });
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.queryByText('Roster')).not.toBeInTheDocument();
  });
});

test('T-06 client validation enforces capacity and field boundaries', () => {
  const form = { title: 'Git', location: 'R', description: '', startsAt: '2099-11-20T14:00', endsAt: '2099-11-20T16:00', capacity: '1' };
  expect(validateEventForm(form)).toEqual({});
  expect(validateEventForm({ ...form, capacity: '1000', title: 'x'.repeat(120), location: 'x'.repeat(200), description: 'x'.repeat(2000) })).toEqual({});
  for (const capacity of ['', '0', '-1', '1.5', '1001']) expect(validateEventForm({ ...form, capacity })).toHaveProperty('capacity');
  expect(validateEventForm({ ...form, title: 'x'.repeat(121), location: 'x'.repeat(201), description: 'x'.repeat(2001), endsAt: form.startsAt })).toMatchObject({ title: expect.any(String), location: expect.any(String), description: expect.any(String), endsAt: expect.any(String) });
});
