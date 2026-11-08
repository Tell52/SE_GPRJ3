export type Role = 'PARTICIPANT' | 'ORGANIZER';
export type User = { id: number; name: string; email: string; role: Role };
export type FieldError = { field: string; message: string };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: FieldError[] = [],
  ) {
    super(message);
  }
}

export const NETWORK_ERROR_MESSAGE = 'Could not reach the server. Try again.';

// Kept in memory only (never localStorage). Set from login and /me, cleared on logout.
let csrfToken: string | null = null;
export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

type Options = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown };

export async function apiFetch<T>(path: string, { method = 'GET', body }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'INTERNAL_ERROR',
      error?.message ?? 'An unexpected error occurred.',
      Array.isArray(error?.details) ? error.details : [],
    );
  }
  return data as T;
}

export const roleHome = (role: Role) => (role === 'ORGANIZER' ? '/organizer/events' : '/events');
export const roleLabel = (role: Role) => (role === 'ORGANIZER' ? 'Organizer' : 'Participant');
