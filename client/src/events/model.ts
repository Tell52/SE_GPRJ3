import { ApiError, NETWORK_ERROR_MESSAGE } from '../api';

export type EventRecord = {
  id: number; title: string; description: string | null; location: string;
  startsAt: string; endsAt: string; capacity: number; activeCount: number; remainingPlaces: number;
  status: 'DRAFT' | 'PUBLISHED'; publishedAt: string | null; organizer: { id: number; name: string };
  myRegistration?: { id: number; status: string } | null;
};
export const errorMessage = (error: unknown) => error instanceof ApiError ? error.message : NETWORK_ERROR_MESSAGE;
export const formatTime = (value: string) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

export type EventForm = { title: string; description: string; location: string; startsAt: string; endsAt: string; capacity: string };
export function validateEventForm(form: EventForm) {
  const errors: Partial<Record<keyof EventForm, string>> = {};
  if (form.title.trim().length < 3 || form.title.trim().length > 120) errors.title = 'Title must be 3 to 120 characters.';
  if (form.description.length > 2000) errors.description = 'Description must be at most 2000 characters.';
  if (!form.location.trim() || form.location.trim().length > 200) errors.location = 'Location must be 1 to 200 characters.';
  const start = Date.parse(form.startsAt + ':00+07:00');
  const end = Date.parse(form.endsAt + ':00+07:00');
  if (!Number.isFinite(start) || start <= Date.now()) errors.startsAt = 'Start must be in the future.';
  if (!Number.isFinite(end) || end <= start) errors.endsAt = 'End must be after start.';
  const capacity = Number(form.capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000) errors.capacity = 'Capacity must be an integer from 1 to 1000.';
  return errors;
}
