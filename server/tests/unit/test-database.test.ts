import { describe, expect, test } from 'vitest';
import { assertTestDatabase } from '../helpers/test-database.js';

describe('destructive test database guard', () => {
  test.each([
    'postgresql://user:password@localhost:5433/event_planner',
    'postgresql://user:password@localhost:5433/toktickit',
    'postgresql://user:password@remote.example:5434/event_planner_test',
    'postgresql://user:password@localhost:5434/event_planner_test?schema=other',
    'file:///event_planner_test',
  ])('refuses an unsafe reset target', (url) => {
    expect(() => assertTestDatabase(url)).toThrow();
  });
  test('refuses the development database even with other credentials and a localhost alias', () => {
    expect(() => assertTestDatabase(
      'postgresql://test:password@127.0.0.1:5434/event_planner_test?schema=public',
      'postgresql://dev:password@localhost:5434/event_planner_test',
    )).toThrow('Refusing to reset');
  });
  test('allows the dedicated local test database', () => {
    const target = 'postgresql://test:password@localhost:5434/event_planner_test?schema=public';
    expect(assertTestDatabase(target, 'postgresql://dev:password@localhost:5433/event_planner')).toBe(target);
  });
});
