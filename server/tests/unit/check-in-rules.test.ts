import { describe, expect, test } from 'vitest';
import * as rules from '../../src/services/registration-rules.js';

// F-09 check-in rule, T-37/T-38 unit level. Looked up on the module so that, before the rule exists,
// these tests fail on their assertions instead of on a missing import.
type Input = { eventStatus: string; status: string; checkedInAt: Date | null; startsAt: Date; endsAt: Date; now: Date };
const decideCheckIn = (input: Input) =>
  ((rules as Record<string, unknown>).decideCheckIn as ((i: Input) => string) | undefined)?.(input) ?? 'not implemented';

const startsAt = new Date('2026-12-01T12:00:00Z');
const endsAt = new Date('2026-12-01T14:00:00Z');
const base = { eventStatus: 'PUBLISHED', status: 'ACTIVE', checkedInAt: null, startsAt, endsAt };
const HOUR = 3600000;

describe('T-37 / T-38 (unit), F-09: decideCheckIn', () => {
  test('window opens exactly at start - 1 h and closes exactly at end', () => {
    expect(decideCheckIn({ ...base, now: new Date(startsAt.getTime() - HOUR - 1) })).toBe('CHECK_IN_CLOSED');
    expect(decideCheckIn({ ...base, now: new Date(startsAt.getTime() - HOUR) })).toBe('OK');
    expect(decideCheckIn({ ...base, now: new Date(endsAt.getTime() - 1) })).toBe('OK');
    expect(decideCheckIn({ ...base, now: endsAt })).toBe('CHECK_IN_CLOSED');
  });
  test('state is checked before the window: cancelled event or registration is INVALID_STATE, a second check-in is ALREADY_CHECKED_IN', () => {
    const outside = new Date(endsAt.getTime() + HOUR);
    expect(decideCheckIn({ ...base, eventStatus: 'CANCELLED', now: outside })).toBe('INVALID_STATE');
    expect(decideCheckIn({ ...base, status: 'CANCELLED', now: outside })).toBe('INVALID_STATE');
    expect(decideCheckIn({ ...base, checkedInAt: startsAt, now: outside })).toBe('ALREADY_CHECKED_IN');
  });
});
