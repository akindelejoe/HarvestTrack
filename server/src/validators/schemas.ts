import { z } from 'zod';
import { parseDateOnly, startOfDayUTC } from '../utils/dates.js';
import { E164_REGEX, normalizePhone } from '../utils/phone.js';

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  trimmed(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const uuid = (label: string) => z.string({ required_error: `${label} is required.` }).uuid(`${label} is invalid.`);

/** YYYY-MM-DD calendar date that must exist and must not be in the future. */
const pastOrTodayDate = (label: string) =>
  z
    .string({ required_error: `${label} is required.` })
    .refine((v) => {
      try {
        parseDateOnly(v);
        return true;
      } catch {
        return false;
      }
    }, `${label} must be a valid date (YYYY-MM-DD).`)
    .transform((v) => parseDateOnly(v))
    .refine((d) => d.getUTCFullYear() >= 2000, `${label} must be after the year 2000.`)
    .refine((d) => d <= startOfDayUTC(), `${label} cannot be in the future.`);

// ---------- Auth ----------
export const registerSchema = z.object({
  name: trimmed(120).min(2, 'Name must be at least 2 characters.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password is too long.')
    .regex(/[A-Za-z]/, 'Password must contain a letter.')
    .regex(/\d/, 'Password must contain a number.'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

// ---------- Farms & fields ----------
export const farmSchema = z
  .object({
    name: trimmed(120).min(2, 'Farm name must be at least 2 characters.'),
    location: trimmed(200).min(2, 'Location is required.'),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine((v) => (v.latitude === undefined) === (v.longitude === undefined), {
    message: 'Provide both latitude and longitude, or neither.',
    path: ['latitude'],
  });

export const fieldSchema = z.object({
  farmId: uuid('Farm'),
  name: trimmed(120).min(1, 'Field name is required.'),
  areaAcres: z.coerce.number().positive('Area must be greater than zero.').max(1_000_000).optional().nullable(),
  soilType: optionalText(60),
});

export const fieldUpdateSchema = fieldSchema.omit({ farmId: true }).partial();

export const fieldQuerySchema = z.object({ farmId: z.string().uuid().optional() });

// ---------- Plantings ----------
export const plantingSchema = z
  .object({
    cropTypeId: uuid('Crop'),
    farmId: uuid('Farm'),
    fieldId: z.string().uuid('Field is invalid.').optional(),
    newFieldName: trimmed(120).min(1).optional(),
    variety: optionalText(120),
    plantingDate: pastOrTodayDate('Planting date'),
    plotLocation: optionalText(160),
    notes: optionalText(2000),
  })
  .refine((v) => Boolean(v.fieldId) !== Boolean(v.newFieldName), {
    message: 'Select an existing field or enter a new field name.',
    path: ['fieldId'],
  });

export const plantingUpdateSchema = z.object({
  cropTypeId: z.string().uuid().optional(),
  fieldId: z.string().uuid().optional(),
  variety: optionalText(120),
  plantingDate: pastOrTodayDate('Planting date').optional(),
  plotLocation: optionalText(160),
  notes: optionalText(2000),
  status: z.enum(['ACTIVE', 'FAILED']).optional(),
});

export const plantingQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'HARVESTED', 'FAILED', 'ALL']).default('ACTIVE'),
  farmId: z.string().uuid().optional(),
  fieldId: z.string().uuid().optional(),
});

export const activityNoteSchema = z.object({
  description: trimmed(1000).min(1, 'Note cannot be empty.'),
});

// ---------- Harvests ----------
export const harvestSchema = z.object({
  actualHarvestDate: pastOrTodayDate('Harvest date'),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number.' })
    .min(0, 'Quantity cannot be negative.')
    .max(1e9, 'Quantity is unrealistically large.'),
  unit: z.enum(['KG', 'LB', 'TONS', 'BUSHELS', 'CRATES'], { errorMap: () => ({ message: 'Select a unit.' }) }),
  quality: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR'], { errorMap: () => ({ message: 'Select crop quality.' }) }),
  notes: optionalText(2000),
});

export const harvestQuerySchema = z.object({
  season: z.coerce.number().int().min(2000).max(2100).optional(),
});

// ---------- Weather & alerts ----------
export const weatherQuerySchema = z.object({
  farmId: z.string().uuid().optional(),
  refresh: z.enum(['true', 'false']).optional(),
});

export const alertQuerySchema = z.object({
  severity: z.enum(['LOW', 'MODERATE', 'HIGH']).optional(),
  unread: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  plantingId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const idParamSchema = z.object({ id: z.string().uuid('Invalid id.') });

// ---------- Settings ----------
export const notificationPrefsSchema = z
  .object({
    phoneNumber: z
      .string()
      .trim()
      .transform(normalizePhone)
      .optional()
      .nullable()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || E164_REGEX.test(v), 'Use international format, e.g. +15551234567.'),
    smsEnabled: z.boolean(),
    minimumSeverity: z.enum(['LOW', 'MODERATE', 'HIGH']),
  })
  .refine((v) => !v.smsEnabled || v.phoneNumber, {
    message: 'Add a valid phone number before enabling SMS alerts.',
    path: ['phoneNumber'],
  });

export const profileSchema = z.object({ name: trimmed(120).min(2, 'Name must be at least 2 characters.') });
