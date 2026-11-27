/** BR-02 (#49): registration closes this long before the event start, by the server clock. */
export const REGISTRATION_CUTOFF_MS = 60 * 60 * 1000;

export function registrationCutoff(startsAt: Date, deadline?: Date | null) {
  const fixed = startsAt.getTime() - REGISTRATION_CUTOFF_MS;
  return new Date(deadline ? Math.min(fixed, deadline.getTime()) : fixed);
}

export type RegistrationDecision = 'OK' | 'NOT_FOUND' | 'REGISTRATION_CLOSED' | 'ALREADY_REGISTERED' | 'EVENT_FULL';

export type RegistrationFacts = {
  event: { status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED'; startsAt: Date; registrationDeadline?: Date | null; capacity: number } | null;
  hasActiveRegistration: boolean;
  activeCount: number;
  now: Date;
};

/**
 * Pure registration rule (BR-02, BR-03, BR-04), checked in this order:
 * missing or draft event, server time at or after the effective cutoff, duplicate, then capacity.
 * The service calls it inside a transaction that holds the event row lock.
 */
export function decideRegistration({ event, hasActiveRegistration, activeCount, now }: RegistrationFacts): RegistrationDecision {
  if (!event || event.status !== 'PUBLISHED') return 'NOT_FOUND';
  if (now >= registrationCutoff(event.startsAt, event.registrationDeadline)) return 'REGISTRATION_CLOSED';
  if (hasActiveRegistration) return 'ALREADY_REGISTERED';
  if (activeCount >= event.capacity) return 'EVENT_FULL';
  return 'OK';
}
