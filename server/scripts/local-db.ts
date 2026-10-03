/**
 * Zero-install local PostgreSQL for development.
 * Runs a real PostgreSQL server (via the embedded-postgres binaries) with data in server/.pgdata.
 * Any other PostgreSQL works too — just point DATABASE_URL at it.
 */
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.LOCAL_PG_PORT ?? 5433);
const dataDir = path.resolve(import.meta.dirname, '../.pgdata');
const isFresh = !existsSync(dataDir);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'harvest',
  password: 'harvest',
  port: PORT,
  persistent: true,
});

if (isFresh) await pg.initialise();
await pg.start();
if (isFresh) await pg.createDatabase('harvesttrack');

console.log(`PostgreSQL running on port ${PORT}`);
console.log(`DATABASE_URL="postgresql://harvest:harvest@localhost:${PORT}/harvesttrack"`);
console.log('Press Ctrl+C to stop.');

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
