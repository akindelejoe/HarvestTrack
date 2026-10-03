import type { Request, Response } from 'express';
import { currentUserId } from '../middleware/auth.js';
import { cropTypeService } from '../services/cropTypeService.js';
import { harvestService } from '../services/harvestService.js';
import { plantingService } from '../services/plantingService.js';

export const plantingController = {
  async list(req: Request, res: Response) {
    res.json({ plantings: await plantingService.list(currentUserId(req), req.query as never) });
  },
  async get(req: Request, res: Response) {
    res.json({ planting: await plantingService.get(currentUserId(req), String(req.params.id)) });
  },
  async create(req: Request, res: Response) {
    res.status(201).json({ planting: await plantingService.create(currentUserId(req), req.body) });
  },
  async update(req: Request, res: Response) {
    res.json({ planting: await plantingService.update(currentUserId(req), String(req.params.id), req.body) });
  },
  async remove(req: Request, res: Response) {
    await plantingService.remove(currentUserId(req), String(req.params.id));
    res.status(204).end();
  },
  async addNote(req: Request, res: Response) {
    res.status(201).json({ activity: await plantingService.addNote(currentUserId(req), String(req.params.id), req.body.description) });
  },
  async recordHarvest(req: Request, res: Response) {
    res.status(201).json({ harvest: await plantingService.recordHarvest(currentUserId(req), String(req.params.id), req.body) });
  },
};

export const cropTypeController = {
  async list(_req: Request, res: Response) {
    res.set('Cache-Control', 'private, max-age=300').json({ cropTypes: await cropTypeService.list() });
  },
};

export const harvestController = {
  async history(req: Request, res: Response) {
    res.json(await harvestService.history(currentUserId(req), (req.query as { season?: number }).season));
  },
};
