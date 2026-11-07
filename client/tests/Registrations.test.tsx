import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from '../src/App';

const participant = { id: 2, name: 'Participant One', email: 'p1@example.test', role: 'PARTICIPANT' };
const organizer = { id: 1, name: 'Organizer One', email: 'org@example.test', role: 'ORGANIZER' };
const event = {
  id: 7, title: 'Git workshop', description: 'Learn Git', location: 'Room 1',
  startsAt: '2099-11-20T07:00:00Z', endsAt: '2099-11-20T09:00:00Z', capacity: 10, activeCount: 3, remainingPlaces: 7,
  status: 'PUBLISHED', publishedAt: '2099-11-01T00:00:00Z', organizer: { id: 1, name: 'Organizer One' }, myRegistration: null,
};
const registration = {
  id: 15, status: 'ACTIVE', registeredAt: '2099-11-02T03:00:00Z',
  event: { id: 7, title: 'Git workshop', startsAt: '2099-11-20T07:00:00Z', endsAt: '2099-11-20T09:00:00Z', location: 'Room 1' },
};
const apiError = (status: number, code: string, message: string) => ({ status, body: { error: { code, message, details: [] } } });

type Reply = { status: number; body: unknown };
let routes: Record<string, Reply | (() => Promise<Reply>) | 'network-error'>;
let calls: { url: string; init: RequestInit }[];

beforeEach(() => {
  calls = [];
  routes = {
    'GET /api/auth/me': { status: 200, body: { user: participant, csrfToken: 'csrf-p' } },
    'GET /api/events/7': { status: 200, body: event },
    'GET /api/registrations/15': { status: 200, body: registration },
    'GET /api/registrations/mine': { status: 200, body: { items: [] } },
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
const registerButton = () => screen.findByRole('button', { name: 'Register' });

describe('T-10 / AC-10 (UI): register and see the saved receipt', () => {
  test('Register shows a busy state, sends the CSRF token, then opens the receipt', async () => {
    let release!: () => void;
    routes['POST /api/events/7/registrations'] = () => new Promise((resolve) => {
      release = () => resolve({ status: 201, body: registration });
    });
    renderAt('/events/7');
    fireEvent.click(await registerButton());
    expect(await screen.findByRole('button', { name: 'Registering...' })).toBeDisabled();
    await act(async () => release());

    expect(await screen.findByText('You are registered')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Git workshop' })).toBeInTheDocument();
    expect(screen.getByText('Registration number').nextSibling).toHaveTextContent('15');
    expect(screen.getByText('Room 1')).toBeInTheDocument();
    const post = calls.find((c) => c.url === '/api/events/7/registrations')!;
    expect(post.init.method).toBe('POST');
    expect((post.init.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf-p');
  });

  test('an already registered participant sees "You are registered" and a link instead of the button', async () => {
    routes['GET /api/events/7'] = { status: 200, body: { ...event, myRegistration: { id: 15, status: 'ACTIVE' } } };
    renderAt('/events/7');
    expect(await screen.findByText('You are registered')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View registration' })).toHaveAttribute('href', '/registrations/15');
    expect(screen.queryByRole('button', { name: 'Register' })).not.toBeInTheDocument();
  });
});

describe('T-11 to T-14 (UI): rejections show the matching message', () => {
  test('EVENT_FULL shows the full message and replaces the button with Full', async () => {
    routes['POST /api/events/7/registrations'] = apiError(409, 'EVENT_FULL', 'This event has no places left.');
    renderAt('/events/7');
    fireEvent.click(await registerButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('Sorry, this event just filled up.');
    expect(screen.queryByRole('button', { name: 'Register' })).not.toBeInTheDocument();
    expect(screen.getByText('Full')).toBeInTheDocument();
    expect(screen.queryByText(/places? left/)).not.toBeInTheDocument();
  });

  test('REGISTRATION_CLOSED shows the closed message and keeps the button for a retry', async () => {
    routes['POST /api/events/7/registrations'] = apiError(409, 'REGISTRATION_CLOSED', 'server text');
    renderAt('/events/7');
    fireEvent.click(await registerButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('Registration for this event is closed.');
    expect(screen.getByRole('button', { name: 'Register' })).toBeEnabled();
  });

  test('ALREADY_REGISTERED (registered in another tab) shows the message, then the saved registration', async () => {
    let detailCalls = 0;
    routes['GET /api/events/7'] = async () => {
      detailCalls += 1;
      return { status: 200, body: detailCalls === 1 ? event : { ...event, activeCount: 4, remainingPlaces: 6, myRegistration: { id: 15, status: 'ACTIVE' } } };
    };
    routes['POST /api/events/7/registrations'] = apiError(409, 'ALREADY_REGISTERED', 'server text');
    renderAt('/events/7');
    fireEvent.click(await registerButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('You are already registered for this event.');
    expect(await screen.findByText('You are registered')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View registration' })).toHaveAttribute('href', '/registrations/15');
    expect(screen.queryByRole('button', { name: 'Register' })).not.toBeInTheDocument();
    expect(screen.getByText('6 places left')).toBeInTheDocument();
  });

  test('a network failure shows the standard message and allows retry', async () => {
    routes['POST /api/events/7/registrations'] = 'network-error';
    renderAt('/events/7');
    fireEvent.click(await registerButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server. Try again.');
    expect(screen.getByRole('button', { name: 'Register' })).toBeEnabled();
  });

  test('a full event shows Full and no Register button', async () => {
    routes['GET /api/events/7'] = { status: 200, body: { ...event, activeCount: 10, remainingPlaces: 0 } };
    renderAt('/events/7');
    expect(await screen.findByRole('heading', { name: 'Git workshop' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Register' })).not.toBeInTheDocument();
    expect(screen.getByText('Full')).toBeInTheDocument();
  });

  test('one remaining place reads "1 place left"', async () => {
    routes['GET /api/events/7'] = { status: 200, body: { ...event, activeCount: 9, remainingPlaces: 1 } };
    renderAt('/events/7');
    expect(await screen.findByText('1 place left')).toBeInTheDocument();
  });

  test('an organizer never sees the Register button', async () => {
    routes['GET /api/auth/me'] = { status: 200, body: { user: organizer, csrfToken: 'csrf-o' } };
    renderAt('/events/7');
    expect(await screen.findByRole('heading', { name: 'Git workshop' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Register' })).not.toBeInTheDocument();
  });
});

describe('T-15 / AC-15 (UI): my registrations and receipt', () => {
  test('My registrations lists own registrations with event details and links to the receipt', async () => {
    routes['GET /api/registrations/mine'] = { status: 200, body: { items: [registration] } };
    renderAt('/registrations');
    const link = await screen.findByRole('link', { name: 'Git workshop' });
    expect(link).toHaveAttribute('href', '/registrations/15');
    expect(screen.getByText('Room 1')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  test('empty state', async () => {
    renderAt('/registrations');
    expect(await screen.findByText('You have not registered for any events')).toBeInTheDocument();
  });

  test('a registration that is not yours shows "Registration not found"', async () => {
    routes['GET /api/registrations/99'] = apiError(404, 'NOT_FOUND', 'Resource not found.');
    renderAt('/registrations/99');
    expect(await screen.findByRole('alert')).toHaveTextContent('Registration not found');
  });

  test('opening a receipt directly does not show the "just registered" message', async () => {
    renderAt('/registrations/15');
    expect(await screen.findByText('Registration number')).toBeInTheDocument();
    expect(screen.queryByText('You are registered')).not.toBeInTheDocument();
  });
});
