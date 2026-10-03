export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = 'ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, message, 'BAD_REQUEST', details);
  }
  static unauthorized(message = 'Please sign in to continue.') {
    return new AppError(401, message, 'UNAUTHORIZED');
  }
  static notFound(resource = 'Resource') {
    // Also used for records owned by other users, so their existence is never revealed.
    return new AppError(404, `${resource} not found.`, 'NOT_FOUND');
  }
  static conflict(message: string) {
    return new AppError(409, message, 'CONFLICT');
  }
  static unprocessable(message: string, code = 'UNPROCESSABLE') {
    return new AppError(422, message, code);
  }
  static unavailable(message: string, code = 'SERVICE_UNAVAILABLE') {
    return new AppError(503, message, code);
  }
}
