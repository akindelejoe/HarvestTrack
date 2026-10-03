type Level = 'info' | 'warn' | 'error';

function log(level: Level, scope: string, message: string, meta?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'test' && level === 'info') return;
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${scope}: ${message}`;
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  meta ? out(line, meta) : out(line);
}

export const logger = {
  info: (scope: string, msg: string, meta?: Record<string, unknown>) => log('info', scope, msg, meta),
  warn: (scope: string, msg: string, meta?: Record<string, unknown>) => log('warn', scope, msg, meta),
  error: (scope: string, msg: string, meta?: Record<string, unknown>) => log('error', scope, msg, meta),
};
