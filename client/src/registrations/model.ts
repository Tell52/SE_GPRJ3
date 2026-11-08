import { ApiError } from '../api';
import { errorMessage } from '../events/model';

export type RegistrationRecord = {
  id: number;
  status: 'ACTIVE';
  registeredAt: string;
  event: { id: number; title: string; startsAt: string; endsAt: string; location: string };
};

const MESSAGES: Record<string, string> = {
  EVENT_FULL: 'Sorry, this event just filled up.',
  ALREADY_REGISTERED: 'You are already registered for this event.',
  REGISTRATION_CLOSED: 'Registration for this event is closed.',
};

export function registerErrorMessage(error: unknown) {
  if (error instanceof ApiError && MESSAGES[error.code]) return MESSAGES[error.code];
  return errorMessage(error);
}
