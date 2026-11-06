import express, { type ErrorRequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import { AppError, notFound, sendError } from './errors.js';
import { authRouter } from './routes/auth.js';
import { eventsRouter } from './routes/events.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());

  app.use('/api/auth', authRouter);
  app.use('/api/events', eventsRouter);

  app.use((_req, res) => sendError(res, notFound()));

  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof AppError) return sendError(res, error);
    const invalidJson = error instanceof SyntaxError && 'body' in error;
    if (invalidJson) return sendError(res, new AppError(400, 'VALIDATION_ERROR', 'Request body must be valid JSON.'));
    console.error('Unhandled request error');
    sendError(res, new AppError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.'));
  };
  app.use(handleError);
  return app;
}
