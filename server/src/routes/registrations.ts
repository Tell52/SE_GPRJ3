import { Router } from 'express';
import { requireCsrf, requireRole, requireSession } from '../middleware/auth.js';
import { notFound } from '../errors.js';
import { cancelMyRegistration, getMyRegistration, listMyRegistrations, registerForEvent } from '../services/registrations.js';
import { getEventRoster } from '../services/roster.js';
import { checkInRegistration } from '../services/check-in.js';

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
// F-09: the owning organizer checks in a registration. Registered before the participant-only middleware below.
registrationsRouter.post('/:id/check-in', requireSession, requireRole('ORGANIZER'), requireCsrf, async (req, res) => {
  res.json(await checkInRegistration(positiveId(req.params.id), req.user!.id));
});
registrationsRouter.use(requireSession, requireRole('PARTICIPANT'));
registrationsRouter.post('/:id/cancel', requireCsrf, async (req, res) => {
  res.json(await cancelMyRegistration(positiveId(req.params.id), req.user!.id));
});
registrationsRouter.get('/mine', async (req, res) => { res.json(await listMyRegistrations(req.user!.id)); });
registrationsRouter.get('/:id', async (req, res) => { res.json(await getMyRegistration(positiveId(req.params.id), req.user!.id)); });
