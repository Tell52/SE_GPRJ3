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
