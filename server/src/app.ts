import express, { type ErrorRequestHandler } from 'express';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  // Feature routes are added in issues #3-6. Do not expose database data here.
  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found.', details: [] } });
  });
  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    const invalidJson = error instanceof SyntaxError && 'body' in error;
    res.status(invalidJson ? 400 : 500).json({
      error: {
        code: invalidJson ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
        message: invalidJson ? 'Request body must be valid JSON.' : 'An unexpected error occurred.',
        details: [],
      },
    });
  };
  app.use(handleError);
  return app;
}
