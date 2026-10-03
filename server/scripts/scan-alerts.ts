/** One-off hazard scan for all farms — handy for cron jobs or demos: npm run alerts:scan */
import { prisma } from '../src/database/prisma.js';
import { alertService } from '../src/services/alertService.js';

const result = await alertService.scan();
console.log(JSON.stringify(result, null, 2));
await prisma.$disconnect();
