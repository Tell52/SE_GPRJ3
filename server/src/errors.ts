import type { Response } from 'express';
import type { ZodError } from 'zod';

export type FieldError = { field: string; message: string };

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: FieldError[] = [],
  ) {
    super(message);
  }
}

export const unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue.');
export const forbidden = () => new AppError(403, 'FORBIDDEN', 'You do not have permission to do this.');
export const csrfInvalid = () => new AppError(403, 'CSRF_INVALID', 'Your session could not be verified. Refresh the page and try again.');
export const notFound = () => new AppError(404, 'NOT_FOUND', 'Resource not found.');

export function validationError(error: ZodError) {
  const details = error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
  return new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid.', details);
}

export function sendError(res: Response, error: AppError) {
  res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } });
}
