import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type ErrorRequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import { prisma } from './db.js';
import { AppError, notFound, sendError } from './errors.js';
import { authRouter } from './routes/auth.js';
import { eventsRouter } from './routes/events.js';
import { eventRegistrationsRouter, registrationsRouter } from './routes/registrations.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Cloud Run terminates HTTPS in front of the container; trust its one proxy hop.
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());

  // Liveness: the process is up. No database call, no session required.
  app.get('/api/health', (_req, res) => { res.json({ status: 'ok' }); });
  // Readiness: the database answers. 503 when it cannot be reached.
  app.get('/api/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', db: 'connected' });
    } catch {
      res.status(503).json({ status: 'unavailable', db: 'disconnected' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/events/:id/registrations', eventRegistrationsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/registrations', registrationsRouter);
  app.use('/api', (_req, res) => sendError(res, notFound()));

  // Production: the same container serves the built React app, so UI and API share one origin
  // (the session cookie and CSRF token work without CORS). Unknown non-API paths get index.html.
  const clientDist = process.env.CLIENT_DIST ?? path.resolve(process.cwd(), '../client/dist');
  if (process.env.NODE_ENV === 'production' && existsSync(path.join(clientDist, 'index.html'))) {
    app.use(express.static(clientDist, { index: false }));
    app.get('/{*path}', (_req, res) => { res.sendFile(path.join(clientDist, 'index.html')); });
  }

  app.use((_req, res) => sendError(res, notFound()));

  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof AppError) return sendError(res, error);
    const invalidJson = error instanceof SyntaxError && 'body' in error;
    if (invalidJson) return sendError(res, new AppError(400, 'VALIDATION_ERROR', 'Request body must be valid JSON.'));
    // Log only the error type and code, never request data or stack details in responses.
    console.error('Unhandled request error', (error as { code?: string })?.code ?? (error as Error)?.name ?? 'unknown');
    sendError(res, new AppError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.'));
  };
  app.use(handleError);
  return app;
}