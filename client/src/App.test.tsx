import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { App } from './App';

test('the foundation shell is accessible and makes no unavailable registration action available', () => {
  render(<App />);
  expect(screen.getByRole('main')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Event Planner', level: 1 })).toBeInTheDocument();
  expect(screen.getByText('Event registration is coming soon.')).toBeVisible();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
