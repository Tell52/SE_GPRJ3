import { Router } from 'express';
import { requireCsrf, requireRole, requireSession } from '../middleware/auth.js';
import { notFound } from '../errors.js';
import { getMyRegistration, listMyRegistrations, registerForEvent } from '../services/registrations.js';
import { getEventRoster } from '../services/roster.js';

function positiveId(value: unknown) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,9}$/.test(value) || Number(value) > 2147483647) throw notFound();
  return Number(value);
}

/** POST /api/events/:id/registrations. Mounted before the events router so it shares the /api/events prefix. */
export const eventRegistrationsRouter = Router({ mergeParams: true });
eventRegistrationsRouter.get('/', requireSession, requireRole('ORGANIZER'), async (req, res) => {
  const params = req.params as Record<string, string>;
  res.json(await getEventRoster(positiveId(params.id), req.user!.id));
});
eventRegistrationsRouter.post('/', requireSession, requireRole('PARTICIPANT'), requireCsrf, async (req, res) => {
  const params = req.params as Record<string, string>;
  res.status(201).json(await registerForEvent(positiveId(params.id), req.user!.id));
});

/** GET /api/registrations/mine and GET /api/registrations/:id, Participants only. */
export const registrationsRouter = Router();
registrationsRouter.use(requireSession, requireRole('PARTICIPANT'));
registrationsRouter.get('/mine', async (req, res) => { res.json(await listMyRegistrations(req.user!.id)); });
registrationsRouter.get('/:id', async (req, res) => { res.json(await getMyRegistration(positiveId(req.params.id), req.user!.id)); });
