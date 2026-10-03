import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export const SESSION_COOKIE = 'ht_session';

export interface AuthUser {
  id: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signSession(user: AuthUser): string {
  return jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: `${env.SESSION_TTL_HOURS}h`,
  });
}

/** Verifies the httpOnly session cookie (or a Bearer token for API clients). */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = req.cookies?.[SESSION_COOKIE] ?? (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
  if (!token) return next(AppError.unauthorized());

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    req.user = { id: String(payload.sub), email: String(payload.email) };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, 'Your session has expired. Please sign in again.', 'SESSION_EXPIRED'));
    }
    next(AppError.unauthorized('Invalid session. Please sign in again.'));
  }
}

/** Narrowing helper for controllers behind requireAuth. */
export function currentUserId(req: Request): string {
  if (!req.user) throw AppError.unauthorized();
  return req.user.id;
}
