import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { alertService } from './alertService.js';
import { pruneSnapshots } from './weatherService.js';

let timer: NodeJS.Timeout | undefined;
let running = false;

async function tick() {
  if (running) return; // never overlap scans
  running = true;
  try {
    const r = await alertService.scan();
    await pruneSnapshots();
    logger.info(
      'scheduler',
      `Hazard scan: ${r.farmsScanned} farm(s), ${r.plantingsEvaluated} planting(s), ${r.alertsCreated} new / ${r.alertsEscalated} escalated alert(s), ${r.smsSent} SMS`,
    );
  } catch (err) {
    logger.error('scheduler', 'Hazard scan failed', { error: (err as Error).message });
  } finally {
    running = false;
  }
}

/** Periodic weather-hazard scan. Production systems might use a job queue; an interval suffices here. */
export function startScheduler() {
  if (env.ALERT_SCAN_INTERVAL_MINUTES <= 0) return logger.info('scheduler', 'Disabled (ALERT_SCAN_INTERVAL_MINUTES=0)');
  setTimeout(tick, 15_000).unref();
  timer = setInterval(tick, env.ALERT_SCAN_INTERVAL_MINUTES * 60_000);
  timer.unref();
  logger.info('scheduler', `Hazard scan every ${env.ALERT_SCAN_INTERVAL_MINUTES} min`);
}

export function stopScheduler() {
  if (timer) clearInterval(timer);
}
