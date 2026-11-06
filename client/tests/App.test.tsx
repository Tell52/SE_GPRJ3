import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from '../src/App';

type Reply = { status: number; body: unknown } | 'network-error';
type Call = { url: string; method: string; headers: Record<string, string>; body?: string };

const participant = { id: 3, name: 'Participant One', email: 'participant1@example.test', role: 'PARTICIPANT' };
const organizer = { id: 1, name: 'Organizer One', email: 'organizer1@example.test', role: 'ORGANIZER' };
const unauthenticated = { status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'Please log in to continue.', details: [] } } };

let calls: Call[];
let routes: Record<string, Reply | (() => Reply | Promise<Reply>)>;

beforeEach(() => {
  calls = [];
  routes = {
    'GET /api/auth/me': unauthenticated,
    'GET /api/events': { status: 200, body: { items: [] } },
    'GET /api/events/mine': { status: 200, body: { items: [] } },
  };
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    calls.push({ url, method, headers: (init.headers ?? {}) as Record<string, string>, body: init.body as string | undefined });
    const route = routes[`${method} ${url}`];
    const reply = typeof route === 'function' ? await route() : route;
    if (!reply) throw new Error(`Unexpected request ${method} ${url}`);
    if (reply === 'network-error') throw new TypeError('Failed to fetch');
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'Content-Type': 'application/json' } });
  }));
});

afterEach(() => vi.unstubAllGlobals());

function renderAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
}

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

describe('T-04 (UI) / AC-01, AC-04: login screen', () => {
  test('an unauthenticated visit to a protected route shows the login page', async () => {
    renderAt('/organizer/events');
    expect(await screen.findByRole('heading', { name: 'Log in to Event Planner' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  test('empty submit shows field messages, focuses email and sends no login request', async () => {
    renderAt('/login');
    await screen.findByLabelText('Email');
    submit();
    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-describedby', 'email-error');
    expect(calls.filter((c) => c.url === '/api/auth/login')).toHaveLength(0);
  });

  test('wrong credentials show the API message in an alert and stay on the login page', async () => {
    routes['POST /api/auth/login'] = { status: 401, body: { error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.', details: [] } } };
    renderAt('/login');
    await screen.findByLabelText('Email');
    fill('Email', 'participant1@example.test');
    fill('Password', 'wrong');
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
    expect(screen.getByRole('heading', { name: 'Log in to Event Planner' })).toBeInTheDocument();
  });

  test('a network failure shows the standard message', async () => {
    routes['POST /api/auth/login'] = 'network-error';
    renderAt('/login');
    await screen.findByLabelText('Email');
    fill('Email', 'participant1@example.test');
    fill('Password', 'secret');
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server. Try again.');
  });

  test('successful participant login shows a busy button, then the participant home with name and role', async () => {
    let release!: () => void;
    routes['POST /api/auth/login'] = () => new Promise((resolve) => {
      release = () => resolve({ status: 200, body: { user: participant, csrfToken: 'csrf-p' } });
    });
    renderAt('/login');
    await screen.findByLabelText('Email');
    fill('Email', 'participant1@example.test');
    fill('Password', 'secret');
    submit();
    expect(await screen.findByRole('button', { name: 'Logging in...' })).toBeDisabled();
    await act(async () => release());

    expect(await screen.findByRole('heading', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByText('Participant One')).toBeInTheDocument();
    expect(screen.getByText('Participant')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My registrations' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My events' })).not.toBeInTheDocument();

    const loginCall = calls.find((c) => c.url === '/api/auth/login')!;
    expect(JSON.parse(loginCall.body!)).toEqual({ email: 'participant1@example.test', password: 'secret' });
  });

  test('successful organizer login lands on My events', async () => {
    routes['POST /api/auth/login'] = { status: 200, body: { user: organizer, csrfToken: 'csrf-o' } };
    renderAt('/login');
    await screen.findByLabelText('Email');
    fill('Email', 'organizer1@example.test');
    fill('Password', 'secret');
    submit();
    expect(await screen.findByRole('heading', { name: 'My events' })).toBeInTheDocument();
    expect(screen.getByText('Organizer')).toBeInTheDocument();
  });
});

describe('T-04 (UI) / AC-03, AC-04: protected routes and logout', () => {
  test('a participant opening an organizer page sees access denied', async () => {
    routes['GET /api/auth/me'] = { status: 200, body: { user: participant, csrfToken: 'csrf-p' } };
    renderAt('/organizer/events');
    expect(await screen.findByText(/You do not have access to this page/)).toBeInTheDocument();
  });

  test('logout sends the CSRF token, returns to login and no longer shows the previous user', async () => {
    routes['GET /api/auth/me'] = { status: 200, body: { user: participant, csrfToken: 'csrf-from-me' } };
    routes['POST /api/auth/logout'] = { status: 200, body: { ok: true } };
    renderAt('/events');
    expect(await screen.findByText('Participant One')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(await screen.findByRole('heading', { name: 'Log in to Event Planner' })).toBeInTheDocument();
    expect(screen.queryByText('Participant One')).not.toBeInTheDocument();

    const logoutCall = calls.find((c) => c.url === '/api/auth/logout')!;
    expect(logoutCall.method).toBe('POST');
    expect(logoutCall.headers['X-CSRF-Token']).toBe('csrf-from-me');
  });

  test('a failed logout keeps the user signed in and shows the error', async () => {
    routes['GET /api/auth/me'] = { status: 200, body: { user: participant, csrfToken: 'csrf-p' } };
    routes['POST /api/auth/logout'] = 'network-error';
    renderAt('/events');
    await screen.findByText('Participant One');
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server. Try again.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Logout' })).toBeEnabled());
    expect(screen.getByText('Participant One')).toBeInTheDocument();
  });
});
