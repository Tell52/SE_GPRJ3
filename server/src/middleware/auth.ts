import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Role } from '@prisma/client';
import { csrfInvalid, forbidden, unauthenticated } from '../errors.js';
import { findActiveSession, SESSION_COOKIE, tokensEqual, type ActiveSession, type SessionUser } from '../auth/session.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
      authSession?: ActiveSession;
    }
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** 401 unless the request carries a valid, unrevoked, unexpired session cookie. Identity comes only from here. */
export const requireSession: RequestHandler = async (req, _res, next) => {
  try {
    const token = typeof req.cookies?.[SESSION_COOKIE] === 'string' ? req.cookies[SESSION_COOKIE] : '';
    const session = token ? await findActiveSession(token) : null;
    if (!session) return next(unauthenticated());
    req.authSession = session;
    req.user = session.user;
    next();
  } catch (error) {
    next(error);
  }
};

/** 403 unless the session user has one of the roles. Must run after requireSession. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(unauthenticated());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

/** 403 CSRF_INVALID on state changing requests without the session's X-CSRF-Token. Must run after requireSession. */
export function requireCsrf(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const header = req.get('x-csrf-token') ?? '';
  if (!req.authSession || !header || !tokensEqual(header, req.authSession.csrfToken)) return next(csrfInvalid());
  next();
}
