import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError.js';

type Source = 'body' | 'query' | 'params';

/** Validates and replaces req[source] with the parsed (coerced, trimmed) value. */
export function validate(schema: ZodTypeAny, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const first = result.error.issues[0];
      return next(AppError.badRequest(first?.message ?? 'Invalid request.', fieldErrors));
    }
    // Express 5 exposes req.query as a getter, so redefine it with the parsed value.
    if (source === 'query') Object.defineProperty(req, 'query', { value: result.data, writable: true });
    else req[source] = result.data;
    next();
  };
}
