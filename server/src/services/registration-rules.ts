export type RegistrationDecision = 'OK' | 'NOT_FOUND' | 'REGISTRATION_CLOSED' | 'ALREADY_REGISTERED' | 'EVENT_FULL';

export type RegistrationFacts = {
  event: { status: 'DRAFT' | 'PUBLISHED'; startsAt: Date; capacity: number } | null;
  hasActiveRegistration: boolean;
  activeCount: number;
  now: Date;
};

/**
 * Pure registration rule (BR-02, BR-03, BR-04), checked in this order:
 * missing or draft event, registration closed at start, duplicate, then capacity.
 * The service calls it inside a transaction that holds the event row lock.
 */
export function decideRegistration({ event, hasActiveRegistration, activeCount, now }: RegistrationFacts): RegistrationDecision {
  if (!event || event.status !== 'PUBLISHED') return 'NOT_FOUND';
  if (event.startsAt.getTime() <= now.getTime()) return 'REGISTRATION_CLOSED';
  if (hasActiveRegistration) return 'ALREADY_REGISTERED';
  if (activeCount >= event.capacity) return 'EVENT_FULL';
  return 'OK';
}
