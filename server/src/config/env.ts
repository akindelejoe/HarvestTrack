import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4100),
  CLIENT_ORIGIN: z.string().default('http://localhost:5180'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(72),
  WEATHER_PROVIDER: z.enum(['open-meteo', 'openweathermap', 'mock']).default('open-meteo'),
  WEATHER_API_KEY: z.string().optional().default(''),
  WEATHER_CACHE_MINUTES: z.coerce.number().nonnegative().default(30),
  ALERT_SCAN_INTERVAL_MINUTES: z.coerce.number().nonnegative().default(180),
  SMS_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_PHONE_NUMBER: z.string().optional().default(''),
  /** Deprecated alias for TWILIO_PHONE_NUMBER. */
  TWILIO_FROM_NUMBER: z.string().optional().default(''),
  /** Defaults to true in production; set false when serving over plain HTTP (e.g. local Docker). */
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  TWILIO_PHONE_NUMBER: parsed.data.TWILIO_PHONE_NUMBER || parsed.data.TWILIO_FROM_NUMBER,
};
export const isProd = env.NODE_ENV === 'production';
export const cookieSecure = env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProd;
