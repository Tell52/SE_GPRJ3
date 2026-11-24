import { describe, expect, test } from 'vitest';
import { decideRegistration } from '../../src/services/registration-rules.js';

const now = new Date('2026-11-10T00:00:00Z');
const future = new Date('2026-11-20T00:00:00Z');
const published = { status: 'PUBLISHED' as const, startsAt: future, capacity: 2 };

describe('T-12 (unit, TDD) / AC-12: capacity rule in decideRegistration', () => {
  test('a full event is rejected with EVENT_FULL', () => {
    expect(decideRegistration({ event: published, hasActiveRegistration: false, activeCount: 2, now })).toBe('EVENT_FULL');
  });

  test('an over-full count is still rejected', () => {
    expect(decideRegistration({ event: published, hasActiveRegistration: false, activeCount: 3, now })).toBe('EVENT_FULL');
  });

  test('the last place is still available', () => {
    expect(decideRegistration({ event: published, hasActiveRegistration: false, activeCount: 1, now })).toBe('OK');
  });
});

describe('registration rule order (supports T-11 and T-14)', () => {
  test('missing and draft events are NOT_FOUND', () => {
    expect(decideRegistration({ event: null, hasActiveRegistration: false, activeCount: 0, now })).toBe('NOT_FOUND');
    expect(decideRegistration({ event: { ...published, status: 'DRAFT' }, hasActiveRegistration: false, activeCount: 0, now })).toBe('NOT_FOUND');
  });

  test('an event that has started is REGISTRATION_CLOSED, even if places remain', () => {
    expect(decideRegistration({ event: { ...published, startsAt: now }, hasActiveRegistration: false, activeCount: 0, now })).toBe('REGISTRATION_CLOSED');
  });

  test('an existing active registration is ALREADY_REGISTERED, checked before capacity', () => {
    expect(decideRegistration({ event: published, hasActiveRegistration: true, activeCount: 2, now })).toBe('ALREADY_REGISTERED');
  });
});

describe('T-14b (unit, TDD) / AC-14, #49: registration closes 60 minutes before start', () => {
  // 15:00 Bangkok start; the cutoff is 14:00 Bangkok (07:00Z). The server clock is `now`.
  const startsAt = new Date('2026-11-20T08:00:00Z');
  const event = { status: 'PUBLISHED' as const, startsAt, capacity: 2 };
  const at = (msBeforeStart: number) => new Date(startsAt.getTime() - msBeforeStart);
  const MIN = 60000;

  test('start - 60 min - 1 s (13:59:59 Bangkok) is still open', () => {
    expect(decideRegistration({ event, hasActiveRegistration: false, activeCount: 0, now: at(60 * MIN + 1000) })).toBe('OK');
  });

  test.each([
    ['exactly start - 60 min (14:00:00)', 60 * MIN],
    ['start - 30 min', 30 * MIN],
    ['the start time itself', 0],
  ])('%s is REGISTRATION_CLOSED', (_label, before) => {
    expect(decideRegistration({ event, hasActiveRegistration: false, activeCount: 0, now: at(before) })).toBe('REGISTRATION_CLOSED');
  });

  test('after the cutoff the closed check comes before duplicate and capacity', () => {
    expect(decideRegistration({ event, hasActiveRegistration: true, activeCount: 1, now: at(60 * MIN) })).toBe('REGISTRATION_CLOSED');
    expect(decideRegistration({ event, hasActiveRegistration: false, activeCount: 2, now: at(60 * MIN) })).toBe('REGISTRATION_CLOSED');
  });
});
