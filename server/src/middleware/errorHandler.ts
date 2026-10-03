import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, `Route ${req.method} ${req.path} not found.`, 'ROUTE_NOT_FOUND'));
}

/** Converts every error into a consistent JSON shape without leaking internals. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: { code: 'DUPLICATE', message: 'A record with these details already exists.' } });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found.' } });
    }
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    logger.error('db', 'Database unavailable', { message: err.message });
    return res.status(503).json({
      error: { code: 'DATABASE_UNAVAILABLE', message: 'The database is temporarily unavailable. Please try again shortly.' },
    });
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Request body is not valid JSON.' } });
  }

  logger.error('http', `Unhandled error on ${req.method} ${req.path}`, {
    error: err instanceof Error ? err.stack : String(err),
  });
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong on our side. Please try again.' } });
}
