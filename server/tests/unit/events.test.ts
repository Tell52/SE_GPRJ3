import { describe, expect, test } from 'vitest';
import { eventInputSchema } from '../../src/validation/events.js';

const valid = () => ({ title: ' Git workshop ', location: ' Room 1 ', description: '', capacity: 10,
  startsAt: new Date(Date.now() + 86400000).toISOString(), endsAt: new Date(Date.now() + 90000000).toISOString() });

describe('T-06 / AC-06 event validation', () => {
  test.each([0, -1, 1.5, 1001, undefined, '10', null])('rejects capacity %s', (capacity) => {
    const result = eventInputSchema.safeParse({ ...valid(), capacity });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === 'capacity')).toBe(true);
  });
  test.each([1, 1000])('accepts capacity boundary %s and trims strings', (capacity) => {
    const input = valid();
    expect(eventInputSchema.parse({ ...input, capacity, organizerId: 99 })).toEqual({ ...input, title: 'Git workshop', location: 'Room 1', capacity });
  });
  test.each([
    ['title', '  '], ['title', 'ab'], ['title', 'a'.repeat(121)], ['location', ' '],
    ['location', 'x'.repeat(201)], ['description', 'x'.repeat(2001)],
    ['startsAt', 'bad'], ['startsAt', '2020-01-01T00:00:00Z'], ['startsAt', '2099-02-30T12:00:00Z'],
    ['endsAt', '2020-01-01T00:00:00Z'],
  ])('rejects invalid %s', (field, value) => {
    const result = eventInputSchema.safeParse({ ...valid(), [field]: value });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
  });
});
