import { Router } from 'express';
import { requireCsrf, requireRole, requireSession } from '../middleware/auth.js';
import { notFound, validationError } from '../errors.js';
import { eventInputSchema } from '../validation/events.js';
import { createEvent, eventDetail, listEvents, publishEvent } from '../services/events.js';

export const eventsRouter = Router();
eventsRouter.use(requireSession);

function eventId(value: unknown) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) throw notFound();
  return Number(value);
}

eventsRouter.post('/', requireRole('ORGANIZER'), requireCsrf, async (req, res) => {
  const parsed = eventInputSchema.safeParse(req.body);
  if (!parsed.success) throw validationError(parsed.error);
  res.status(201).json(await createEvent(parsed.data, req.user!.id));
});
eventsRouter.get('/', async (_req, res) => { res.json(await listEvents()); });
eventsRouter.get('/mine', requireRole('ORGANIZER'), async (req, res) => { res.json(await listEvents(req.user!.id)); });
eventsRouter.get('/:id', async (req, res) => { res.json(await eventDetail(eventId(req.params.id), req.user!)); });
eventsRouter.post('/:id/publish', requireRole('ORGANIZER'), requireCsrf, async (req, res) => {
  res.json(await publishEvent(eventId(req.params.id), req.user!.id));
});
