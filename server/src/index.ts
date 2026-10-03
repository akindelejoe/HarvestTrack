import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './database/prisma.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    await prisma.$connect();
  } catch (err) {
    logger.error('db', 'Could not connect to PostgreSQL. Is DATABASE_URL correct and the database running?', {
      error: (err as Error).message,
    });
    process.exit(1);
  }

  const server = createApp().listen(env.PORT, () => {
    logger.info('server', `HarvestTrack API listening on http://localhost:${env.PORT}`);
  });
  startScheduler();

  const shutdown = async (signal: string) => {
    logger.info('server', `${signal} received, shutting down`);
    stopScheduler();
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void main();
