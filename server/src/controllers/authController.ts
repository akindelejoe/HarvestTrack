import type { CookieOptions, Request, Response } from 'express';
import { cookieSecure, env } from '../config/env.js';
import { SESSION_COOKIE, currentUserId, signSession } from '../middleware/auth.js';
import { authService, type PublicUser } from '../services/authService.js';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: 'lax',
  maxAge: env.SESSION_TTL_HOURS * 3_600_000,
  path: '/',
};

function startSession(res: Response, user: PublicUser) {
  res.cookie(SESSION_COOKIE, signSession({ id: user.id, email: user.email }), cookieOptions);
}

export const authController = {
  async register(req: Request, res: Response) {
    const user = await authService.register(req.body);
    startSession(res, user);
    res.status(201).json({ user });
  },
  async login(req: Request, res: Response) {
    const user = await authService.login(req.body.email, req.body.password);
    startSession(res, user);
    res.json({ user });
  },
  logout(_req: Request, res: Response) {
    res.clearCookie(SESSION_COOKIE, { ...cookieOptions, maxAge: undefined });
    res.status(204).end();
  },
  async me(req: Request, res: Response) {
    res.json({ user: await authService.me(currentUserId(req)) });
  },
};
