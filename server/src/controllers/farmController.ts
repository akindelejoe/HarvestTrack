import type { Request, Response } from 'express';
import { currentUserId } from '../middleware/auth.js';
import { farmService } from '../services/farmService.js';
import { fieldService } from '../services/fieldService.js';

const presentFarm = (f: Awaited<ReturnType<typeof farmService.create>>) => ({
  ...f,
  latitude: Number(f.latitude),
  longitude: Number(f.longitude),
});

export const farmController = {
  async list(req: Request, res: Response) {
    const farms = await farmService.list(currentUserId(req));
    res.json({
      farms: farms.map((f) => ({
        ...presentFarm(f),
        fields: f.fields.map(({ _count, ...field }) => ({
          ...field,
          areaAcres: field.areaAcres ? Number(field.areaAcres) : null,
          activePlantings: _count.plantings,
        })),
      })),
    });
  },
  async create(req: Request, res: Response) {
    res.status(201).json({ farm: presentFarm(await farmService.create(currentUserId(req), req.body)) });
  },
  async update(req: Request, res: Response) {
    res.json({ farm: presentFarm(await farmService.update(currentUserId(req), String(req.params.id), req.body)) });
  },
  async remove(req: Request, res: Response) {
    await farmService.remove(currentUserId(req), String(req.params.id));
    res.status(204).end();
  },
};

const presentField = <T extends { areaAcres: unknown }>(f: T) => ({ ...f, areaAcres: f.areaAcres ? Number(f.areaAcres) : null });

export const fieldController = {
  async list(req: Request, res: Response) {
    const fields = await fieldService.list(currentUserId(req), (req.query as { farmId?: string }).farmId);
    res.json({ fields: fields.map(({ _count, ...f }) => ({ ...presentField(f), activePlantings: _count.plantings })) });
  },
  async create(req: Request, res: Response) {
    res.status(201).json({ field: presentField(await fieldService.create(currentUserId(req), req.body)) });
  },
  async update(req: Request, res: Response) {
    res.json({ field: presentField(await fieldService.update(currentUserId(req), String(req.params.id), req.body)) });
  },
  async remove(req: Request, res: Response) {
    await fieldService.remove(currentUserId(req), String(req.params.id));
    res.status(204).end();
  },
};
