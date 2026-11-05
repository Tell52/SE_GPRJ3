import { Router, type CookieOptions } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { AppError, validationError } from '../errors.js';
import { dummyPasswordHash, verifyPassword } from '../auth/password.js';
import { createSession, publicUserSelect, revokeSession, SESSION_COOKIE, sessionTtlMs } from '../auth/session.js';
import { requireCsrf, requireSession } from '../middleware/auth.js';

const loginSchema = z.object({
  email: z.string({ error: 'Email is required.' }).trim().toLowerCase()
    .min(1, 'Email is required.').max(254, 'Email is too long.')
    .pipe(z.email('Enter a valid email address.')),
  password: z.string({ error: 'Password is required.' })
    .min(1, 'Password is required.').max(200, 'Password is too long.'),
});

const invalidCredentials = () => new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  };
}

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw validationError(parsed.error);
    const { email, password } = parsed.data;

    // Only email and password are read. Any role or userId in the body is ignored.
    const found = await prisma.user.findUnique({ where: { email }, select: { ...publicUserSelect, passwordHash: true } });
    const matches = await verifyPassword(password, found?.passwordHash ?? await dummyPasswordHash());
    if (!found || !matches) throw invalidCredentials();

    const { passwordHash: _hidden, ...user } = found;
    const session = await createSession(user.id);
    res.cookie(SESSION_COOKIE, session.token, { ...cookieOptions(), maxAge: sessionTtlMs() });
    res.status(200).json({ user, csrfToken: session.csrfToken });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireSession, (req, res) => {
  res.json({ user: req.user, csrfToken: req.authSession!.csrfToken });
});

authRouter.post('/logout', requireSession, requireCsrf, async (req, res, next) => {
  try {
    await revokeSession(req.authSession!.id);
    res.clearCookie(SESSION_COOKIE, cookieOptions());
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
