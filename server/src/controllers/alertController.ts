import type { Request, Response } from 'express';
import { currentUserId } from '../middleware/auth.js';
import { alertService } from '../services/alertService.js';
import { dashboardService } from '../services/dashboardService.js';
import { farmService } from '../services/farmService.js';
import { settingsService } from '../services/settingsService.js';
import { authService } from '../services/authService.js';
import { getFarmWeather } from '../services/weatherService.js';

export const alertController = {
  async list(req: Request, res: Response) {
    const alerts = await alertService.list(currentUserId(req), req.query as never);
    res.json({
      alerts: alerts.map(({ planting, dedupeKey: _dk, ...a }) => ({
        ...a,
        forecastDate: a.forecastDate.toISOString().slice(0, 10),
        planting: planting && {
          id: planting.id,
          crop: planting.cropType.name,
          field: planting.field.name,
          farm: planting.field.farm.name,
        },
      })),
    });
  },
  async markRead(req: Request, res: Response) {
    const alert = await alertService.markRead(currentUserId(req), String(req.params.id));
    res.json({ alert: { id: alert.id, readAt: alert.readAt } });
  },
  async markAllRead(req: Request, res: Response) {
    res.json(await alertService.markAllRead(currentUserId(req)));
  },
  async scan(req: Request, res: Response) {
    res.json({ result: await alertService.scan(currentUserId(req)) });
  },
};

export const weatherController = {
  /** GET /api/weather?farmId=… — forecast for one farm (defaults to the user's first farm). */
  async get(req: Request, res: Response) {
    const userId = currentUserId(req);
    const { farmId, refresh } = req.query as { farmId?: string; refresh?: string };
    const farms = await farmService.list(userId);
    if (farms.length === 0) return res.json({ weather: null, farms: [] });

    const farm = farmId ? await farmService.getOwned(userId, farmId) : farms[0];
    const weather = await getFarmWeather(farm, { forceRefresh: refresh === 'true' });
    res.json({ weather, farms: farms.map((f) => ({ id: f.id, name: f.name, location: f.location })) });
  },
};

export const dashboardController = {
  async summary(req: Request, res: Response) {
    res.json(await dashboardService.summary(currentUserId(req)));
  },
};

export const settingsController = {
  async getNotifications(req: Request, res: Response) {
    res.json({ preferences: await settingsService.getNotifications(currentUserId(req)) });
  },
  async updateNotifications(req: Request, res: Response) {
    res.json({ preferences: await settingsService.updateNotifications(currentUserId(req), req.body) });
  },
  async testSms(req: Request, res: Response) {
    res.json({ result: await settingsService.sendTestSms(currentUserId(req)) });
  },
  async updateProfile(req: Request, res: Response) {
    res.json({ user: await authService.updateProfile(currentUserId(req), req.body.name) });
  },
};
