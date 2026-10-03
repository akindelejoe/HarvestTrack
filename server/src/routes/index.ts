import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { alertController, dashboardController, settingsController, weatherController } from '../controllers/alertController.js';
import { authController } from '../controllers/authController.js';
import { farmController, fieldController } from '../controllers/farmController.js';
import { cropTypeController, harvestController, plantingController } from '../controllers/plantingController.js';
import { prisma } from '../database/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as s from '../validators/schemas.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: env.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a few minutes and try again.' } },
});

const scanLimiter = rateLimit({ windowMs: 60_000, limit: env.NODE_ENV === 'test' ? 1000 : 3, standardHeaders: 'draft-7', legacyHeaders: false });

const id = validate(s.idParamSchema, 'params');

export const api = Router();

/** Liveness + database connectivity (used by Docker health checks). */
api.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unreachable', time: new Date().toISOString() });
  }
});

// --- Auth ---
api.post('/auth/register', authLimiter, validate(s.registerSchema), authController.register);
api.post('/auth/login', authLimiter, validate(s.loginSchema), authController.login);
api.post('/auth/logout', authController.logout);
api.get('/auth/me', requireAuth, authController.me);

// Everything below requires a session.
api.use(requireAuth);

// --- Reference data ---
api.get('/crop-types', cropTypeController.list);

// --- Farms & fields ---
api.get('/farms', farmController.list);
api.post('/farms', validate(s.farmSchema), farmController.create);
api.put('/farms/:id', id, validate(s.farmSchema), farmController.update);
api.delete('/farms/:id', id, farmController.remove);

api.get('/fields', validate(s.fieldQuerySchema, 'query'), fieldController.list);
api.post('/fields', validate(s.fieldSchema), fieldController.create);
api.put('/fields/:id', id, validate(s.fieldUpdateSchema), fieldController.update);
api.delete('/fields/:id', id, fieldController.remove);

// --- Plantings & harvests ---
api.get('/plantings', validate(s.plantingQuerySchema, 'query'), plantingController.list);
api.post('/plantings', validate(s.plantingSchema), plantingController.create);
api.get('/plantings/:id', id, plantingController.get);
api.put('/plantings/:id', id, validate(s.plantingUpdateSchema), plantingController.update);
api.delete('/plantings/:id', id, plantingController.remove);
api.post('/plantings/:id/activities', id, validate(s.activityNoteSchema), plantingController.addNote);
api.post('/plantings/:id/harvest', id, validate(s.harvestSchema), plantingController.recordHarvest);

api.get('/harvests', validate(s.harvestQuerySchema, 'query'), harvestController.history);

// --- Weather & alerts ---
api.get('/weather', validate(s.weatherQuerySchema, 'query'), weatherController.get);

api.get('/alerts', validate(s.alertQuerySchema, 'query'), alertController.list);
api.patch('/alerts/read-all', alertController.markAllRead);
api.patch('/alerts/:id/read', id, alertController.markRead);
api.post('/alerts/scan', scanLimiter, alertController.scan);

// --- Dashboard & settings ---
api.get('/dashboard/summary', dashboardController.summary);

api.get('/settings/notifications', settingsController.getNotifications);
api.put('/settings/notifications', validate(s.notificationPrefsSchema), settingsController.updateNotifications);
api.post('/settings/notifications/test', scanLimiter, settingsController.testSms);
api.put('/settings/profile', validate(s.profileSchema), settingsController.updateProfile);
