import type { Alert, AlertSeverity, Farm, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { AppError } from '../utils/AppError.js';
import { parseDateOnly, startOfDayUTC, addDays } from '../utils/dates.js';
import { logger } from '../utils/logger.js';
import { logActivity } from './activityService.js';
import { detectHazards, severityAtLeast, type HazardFinding } from './hazardDetectionService.js';
import { formatAlertSms, smsService } from './smsService.js';
import { getFarmWeather } from './weatherService.js';

const SEVERITY_ORDER: AlertSeverity[] = ['LOW', 'MODERATE', 'HIGH'];

export interface ScanResult {
  farmsScanned: number;
  plantingsEvaluated: number;
  alertsCreated: number;
  alertsEscalated: number;
  smsSent: number;
  errors: string[];
}

/**
 * Weather → hazard detection → alerts → SMS pipeline for one farm.
 * Returns alerts that are new or have escalated in severity.
 */
async function scanFarm(farm: Farm, result: ScanResult, smsLines: Map<string, string>): Promise<Alert[]> {
  const plantings = await prisma.planting.findMany({
    where: { status: 'ACTIVE', field: { farmId: farm.id } },
    include: { cropType: true, field: true },
  });
  if (plantings.length === 0) return [];

  const weather = await getFarmWeather(farm);
  if (weather.stale) result.errors.push(`Using cached weather for ${farm.name}`);
  const today = weather.daily[0]?.date;
  if (!today) return [];

  result.farmsScanned++;
  const changed: Alert[] = [];

  for (const planting of plantings) {
    result.plantingsEvaluated++;
    const findings = detectHazards(weather.daily, {
      today,
      fieldName: planting.field.name,
      crop: {
        name: planting.cropType.name,
        idealTempMinC: Number(planting.cropType.idealTempMinC),
        idealTempMaxC: Number(planting.cropType.idealTempMaxC),
        frostSensitive: planting.cropType.frostSensitive,
        excessRainSensitive: planting.cropType.excessRainSensitive,
        droughtSensitive: planting.cropType.droughtSensitive,
        windSensitive: planting.cropType.windSensitive,
      },
    });

    for (const f of findings) {
      const alert = await persistFinding(farm.userId, planting.id, f);
      if (alert.kind === 'created') result.alertsCreated++;
      if (alert.kind === 'escalated') result.alertsEscalated++;
      if (alert.kind !== 'unchanged') {
        changed.push(alert.alert);
        smsLines.set(alert.alert.id, f.smsSummary);
        await logActivity(planting.id, 'ALERT_RAISED', `${alert.alert.severity} — ${alert.alert.title}`);
      }
    }
  }
  return changed;
}

async function persistFinding(
  userId: string,
  plantingId: string,
  f: HazardFinding,
): Promise<{ kind: 'created' | 'escalated' | 'unchanged'; alert: Alert }> {
  const dedupeKey = `${plantingId}:${f.type}:${f.forecastDate}`;
  const data = {
    severity: f.severity,
    title: f.title,
    message: f.message,
    impact: f.impact,
    recommendation: f.recommendation,
  };
  const existing = await prisma.alert.findUnique({ where: { dedupeKey } });

  if (!existing) {
    const alert = await prisma.alert.create({
      data: { ...data, userId, plantingId, alertType: f.type, forecastDate: parseDateOnly(f.forecastDate), dedupeKey },
    });
    return { kind: 'created', alert };
  }
  if (SEVERITY_ORDER.indexOf(f.severity) > SEVERITY_ORDER.indexOf(existing.severity)) {
    // Severity went up: refresh the content and surface it again as unread.
    const alert = await prisma.alert.update({ where: { id: existing.id }, data: { ...data, readAt: null } });
    return { kind: 'escalated', alert };
  }
  return { kind: 'unchanged', alert: existing };
}

/** Sends one combined SMS per user for alerts that meet their preference. */
async function notifyUser(userId: string, alerts: Alert[], smsSummaries: Map<string, string>): Promise<number> {
  if (alerts.length === 0) return 0;
  const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (!prefs?.smsEnabled || !prefs.phoneNumber) return 0;

  const eligible = alerts.filter((a) => !a.smsSent && severityAtLeast(a.severity, prefs.minimumSeverity));
  if (eligible.length === 0) return 0;

  const lines = eligible.slice(0, 3).map((a) => smsSummaries.get(a.id) ?? a.title);
  if (eligible.length > 3) lines.push(`+${eligible.length - 3} more alert(s)`);

  const res = await smsService.send(prefs.phoneNumber, formatAlertSms(lines));
  if (res.delivered) {
    await prisma.alert.updateMany({ where: { id: { in: eligible.map((a) => a.id) } }, data: { smsSent: true } });
    return 1;
  }
  return 0;
}

export const alertService = {
  /** Runs the hazard pipeline for every farm of one user (or every user if omitted). */
  async scan(userId?: string): Promise<ScanResult> {
    const result: ScanResult = { farmsScanned: 0, plantingsEvaluated: 0, alertsCreated: 0, alertsEscalated: 0, smsSent: 0, errors: [] };
    const farms = await prisma.farm.findMany({ where: userId ? { userId } : undefined });
    const changedByUser = new Map<string, Alert[]>();
    const smsLines = new Map<string, string>();

    for (const farm of farms) {
      try {
        const changed = await scanFarm(farm, result, smsLines);
        changedByUser.set(farm.userId, [...(changedByUser.get(farm.userId) ?? []), ...changed]);
      } catch (err) {
        const msg = err instanceof AppError ? err.message : (err as Error).message;
        logger.warn('alerts', `Scan failed for farm ${farm.id}`, { error: msg });
        result.errors.push(`${farm.name}: ${msg}`);
      }
    }

    for (const [uid, alerts] of changedByUser) {
      result.smsSent += await notifyUser(uid, alerts, smsLines);
    }
    return result;
  },

  list(userId: string, q: { severity?: AlertSeverity; unread?: boolean; plantingId?: string; limit: number }) {
    const where: Prisma.AlertWhereInput = {
      userId,
      ...(q.severity && { severity: q.severity }),
      ...(q.unread && { readAt: null }),
      ...(q.plantingId && { plantingId: q.plantingId }),
    };
    return prisma.alert.findMany({
      where,
      orderBy: [{ readAt: { sort: 'desc', nulls: 'first' } }, { createdAt: 'desc' }],
      take: q.limit,
      include: { planting: { include: { cropType: true, field: { include: { farm: true } } } } },
    });
  },

  async markRead(userId: string, id: string) {
    const alert = await prisma.alert.findFirst({ where: { id, userId } });
    if (!alert) throw AppError.notFound('Alert');
    return prisma.alert.update({ where: { id }, data: { readAt: alert.readAt ?? new Date() } });
  },

  async markAllRead(userId: string) {
    const { count } = await prisma.alert.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { updated: count };
  },

  /** Alerts whose forecast date is yesterday or later — i.e. still relevant. */
  activeWhere(userId: string): Prisma.AlertWhereInput {
    return { userId, forecastDate: { gte: addDays(startOfDayUTC(), -1) }, planting: { status: 'ACTIVE' } };
  },
};
