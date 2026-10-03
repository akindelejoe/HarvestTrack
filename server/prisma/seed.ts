/**
 * Seeds the crop knowledge catalogue and a demo account.
 * Demo dates are relative to today so the dashboard always shows a realistic mix
 * of Growing, Harvest Soon, Ready, At Risk and Harvested crops.
 *
 *   Demo login: demo@harvesttrack.app / HarvestDemo1
 *
 *   --catalog-only   upsert crop types only (non-destructive; used on container start)
 *   --if-empty       only create the demo account when the database has no users
 */
import { PrismaClient, type AlertSeverity, type AlertType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { CROP_TYPES } from './data/cropTypes.js';

const prisma = new PrismaClient();
const DAY = 86_400_000;
const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
const daysAgo = (n: number) => new Date(today.getTime() - n * DAY);
const daysAhead = (n: number) => new Date(today.getTime() + n * DAY);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export const DEMO_EMAIL = 'demo@harvesttrack.app';
export const DEMO_PASSWORD = 'HarvestDemo1';

async function seedCropTypes() {
  for (const crop of CROP_TYPES) {
    await prisma.cropType.upsert({ where: { name: crop.name }, update: crop, create: crop });
  }
  console.log(`✓ ${CROP_TYPES.length} crop types`);
}

async function seedDemo() {
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } }); // cascades to all demo data

  const crops = Object.fromEntries((await prisma.cropType.findMany()).map((c) => [c.name, c]));
  const user = await prisma.user.create({
    data: {
      name: 'Demo Farmer',
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      notificationPreferences: { create: { phoneNumber: '+15555550123', smsEnabled: true, minimumSeverity: 'HIGH' } },
    },
  });

  const farm = await prisma.farm.create({
    data: { userId: user.id, name: 'Harvest Valley Farm', location: 'Columbus, Ohio', latitude: 39.96118, longitude: -82.99879 },
  });
  const riverside = await prisma.farm.create({
    data: { userId: user.id, name: 'Riverside Plots', location: 'Dayton, Ohio', latitude: 39.75895, longitude: -84.19161 },
  });

  const mkField = (farmId: string, name: string, areaAcres: number | null, soilType: string | null) =>
    prisma.field.create({ data: { farmId, name, areaAcres, soilType } });
  const north = await mkField(farm.id, 'North Field', 42, 'Silt loam');
  const south = await mkField(farm.id, 'South Field', 35, 'Clay loam');
  const greenhouse = await mkField(farm.id, 'Greenhouse', 0.5, 'Potting mix');
  const riverA = await mkField(riverside.id, 'Field A', 12, 'Sandy loam');

  type P = { field: string; crop: string; variety?: string; planted: Date; plot?: string; notes?: string; status?: 'ACTIVE' | 'FAILED' };
  const create = async (p: P) => {
    const c = crops[p.crop];
    return prisma.planting.create({
      data: {
        fieldId: p.field,
        cropTypeId: c.id,
        variety: p.variety,
        plantingDate: p.planted,
        plotLocation: p.plot,
        notes: p.notes,
        status: p.status ?? 'ACTIVE',
        estimatedHarvestStart: new Date(p.planted.getTime() + c.minDaysToHarvest * DAY),
        estimatedHarvestEnd: new Date(p.planted.getTime() + c.maxDaysToHarvest * DAY),
        activities: {
          create: {
            type: 'PLANTED',
            description: `${p.crop}${p.variety ? ` (${p.variety})` : ''} planted on ${ymd(p.planted)}.`,
            createdAt: new Date(p.planted.getTime() + 12 * 3_600_000),
          },
        },
      },
      include: { cropType: true },
    });
  };

  // --- Active season ---
  const corn = await create({ field: north.id, crop: 'Corn', variety: 'Sweet Corn — Silver Queen', planted: daysAgo(82), plot: 'Rows 1–40', notes: 'Side-dressed with nitrogen at V6.' });
  const tomato = await create({ field: greenhouse.id, crop: 'Tomato', variety: 'Roma', planted: daysAgo(66), plot: 'Benches 1–4' });
  const soy = await create({ field: south.id, crop: 'Soybean', variety: 'Group III', planted: daysAgo(48), plot: 'East block' });
  const potato = await create({ field: south.id, crop: 'Potato', variety: 'Yukon Gold', planted: daysAgo(64), plot: 'West block', notes: 'Hilled twice. Low spot near the ditch holds water.' });
  const pepper = await create({ field: greenhouse.id, crop: 'Pepper', variety: 'Bell — California Wonder', planted: daysAgo(21), plot: 'Benches 5–6' });
  const lettuce = await create({ field: riverA.id, crop: 'Lettuce', variety: 'Butterhead', planted: daysAgo(30) });

  // --- Harvested / historical ---
  const hist = [
    { p: { field: greenhouse.id, crop: 'Cucumber', variety: 'Marketmore', planted: new Date(Date.UTC(today.getUTCFullYear(), 4, 2)) }, after: 61, qty: 640, unit: 'KG', quality: 'GOOD' },
    { p: { field: north.id, crop: 'Wheat', variety: 'Hard Red Spring', planted: new Date(Date.UTC(today.getUTCFullYear(), 2, 20)) }, after: 118, qty: 2350, unit: 'BUSHELS', quality: 'EXCELLENT' },
    { p: { field: north.id, crop: 'Corn', variety: 'Dent — Pioneer P1197', planted: new Date(Date.UTC(today.getUTCFullYear() - 1, 3, 28)) }, after: 116, qty: 7600, unit: 'BUSHELS', quality: 'GOOD' },
    { p: { field: south.id, crop: 'Soybean', variety: 'Group III', planted: new Date(Date.UTC(today.getUTCFullYear() - 1, 4, 12)) }, after: 104, qty: 1820, unit: 'BUSHELS', quality: 'GOOD' },
    { p: { field: south.id, crop: 'Potato', variety: 'Russet Burbank', planted: new Date(Date.UTC(today.getUTCFullYear() - 1, 3, 10)) }, after: 112, qty: 58, unit: 'TONS', quality: 'FAIR' },
    { p: { field: greenhouse.id, crop: 'Tomato', variety: 'Cherry — Sungold', planted: new Date(Date.UTC(today.getUTCFullYear() - 1, 2, 30)) }, after: 72, qty: 410, unit: 'CRATES', quality: 'EXCELLENT' },
    { p: { field: riverA.id, crop: 'Carrot', variety: 'Nantes', planted: new Date(Date.UTC(today.getUTCFullYear() - 1, 7, 1)) }, after: 76, qty: 2.4, unit: 'TONS', quality: 'GOOD' },
    { p: { field: north.id, crop: 'Corn', variety: 'Dent', planted: new Date(Date.UTC(today.getUTCFullYear() - 2, 4, 2)) }, after: 121, qty: 7180, unit: 'BUSHELS', quality: 'FAIR' },
  ] as const;

  for (const h of hist) {
    const planting = await create(h.p);
    const harvestDate = new Date(h.p.planted.getTime() + h.after * DAY);
    await prisma.harvest.create({
      data: { plantingId: planting.id, actualHarvestDate: harvestDate, quantity: h.qty, unit: h.unit, quality: h.quality },
    });
    await prisma.planting.update({ where: { id: planting.id }, data: { status: 'HARVESTED' } });
    await prisma.plantingActivity.create({
      data: {
        plantingId: planting.id,
        type: 'HARVESTED',
        description: `Harvested ${h.qty} ${h.unit.toLowerCase()} (${h.quality.toLowerCase()} quality) on ${ymd(harvestDate)}.`,
        createdAt: new Date(harvestDate.getTime() + 12 * 3_600_000),
      },
    });
  }
  await create({
    field: riverA.id,
    crop: 'Cucumber',
    variety: 'Straight Eight',
    planted: new Date(Date.UTC(today.getUTCFullYear() - 1, 5, 5)),
    status: 'FAILED',
    notes: 'Lost to a hailstorm in July.',
  });

  // --- Alerts ---
  type A = { planting: { id: string }; type: AlertType; severity: AlertSeverity; title: string; message: string; impact: string; recommendation: string; on: Date; read?: boolean; sms?: boolean; created?: Date };
  const alerts: A[] = [
    {
      planting: potato, type: 'FROST', severity: 'HIGH', title: 'Frost Warning', on: daysAhead(1), sms: true,
      message: 'Temperatures may drop to -1.5°C tomorrow at South Field, below the safe range for your potato.',
      impact: 'Possible frost damage to leaves, flowers and young fruit.',
      recommendation: 'Consider covering or otherwise protecting sensitive plants and delaying irrigation until it warms.',
    },
    {
      planting: soy, type: 'HEAVY_RAIN', severity: 'MODERATE', title: 'Heavy Rain Warning', on: daysAhead(2),
      message: 'Heavy rainfall (about 31 mm) is forecast for your farm within the next 48 hours, affecting soybean at South Field.',
      impact: 'Possible waterlogging, soil erosion and crop damage.',
      recommendation: 'Inspect drainage and low-lying areas, and postpone fertiliser application.',
    },
    {
      planting: tomato, type: 'EXTREME_HEAT', severity: 'LOW', title: 'Elevated Temperature', on: daysAhead(3), read: true,
      message: 'Highs up to 33.5°C are forecast on Tuesday at Greenhouse, above the ideal range for tomato (18–29°C).',
      impact: 'Possible heat stress, reduced pollination and moisture loss.',
      recommendation: 'Check soil moisture, irrigate early in the day and consider shade for sensitive crops.',
    },
    {
      planting: soy, type: 'STRONG_WIND', severity: 'MODERATE', title: 'Strong Wind Warning', on: daysAgo(12), read: true, created: daysAgo(14),
      message: 'Wind gusts up to 68 km/h were forecast at South Field.',
      impact: 'Possible lodging, broken stems or damaged structures around your soybean.',
      recommendation: 'Secure covers, stakes and greenhouse panels; avoid spraying in high wind.',
    },
    {
      planting: corn, type: 'DROUGHT', severity: 'MODERATE', title: 'Dry Spell Advisory', on: daysAgo(30), read: true, created: daysAgo(31),
      message: 'Only 1.2 mm of rain was forecast over 7 days with average highs of 31°C at North Field.',
      impact: 'Possible moisture stress for corn, especially during flowering or grain fill.',
      recommendation: 'Monitor soil moisture and plan irrigation; consider mulching to reduce evaporation.',
    },
  ];
  for (const a of alerts) {
    await prisma.alert.create({
      data: {
        userId: user.id,
        plantingId: a.planting.id,
        alertType: a.type,
        severity: a.severity,
        title: a.title,
        message: a.message,
        impact: a.impact,
        recommendation: a.recommendation,
        forecastDate: a.on,
        dedupeKey: `${a.planting.id}:${a.type}:${ymd(a.on)}`,
        smsSent: a.sms ?? false,
        readAt: a.read ? daysAgo(1) : null,
        createdAt: a.created ?? daysAgo(0),
      },
    });
    await prisma.plantingActivity.create({
      data: { plantingId: a.planting.id, type: 'ALERT_RAISED', description: `${a.severity} — ${a.title}`, createdAt: a.created ?? new Date() },
    });
  }

  await prisma.plantingActivity.createMany({
    data: [
      { plantingId: corn.id, type: 'NOTE', description: 'Scouted for corn earworm — light pressure, no action needed.', createdAt: daysAgo(9) },
      { plantingId: potato.id, type: 'NOTE', description: 'Some yellowing on lower leaves near the ditch.', createdAt: daysAgo(5) },
      { plantingId: pepper.id, type: 'NOTE', description: 'Transplanted seedlings; drip irrigation set to 20 min/day.', createdAt: daysAgo(20) },
      { plantingId: lettuce.id, type: 'NOTE', description: 'Thinned to 25 cm spacing.', createdAt: daysAgo(12) },
    ],
  });

  console.log(`✓ Demo account: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

const args = new Set(process.argv.slice(2));

async function main() {
  await seedCropTypes();
  if (args.has('--catalog-only')) return;
  if (args.has('--if-empty') && (await prisma.user.count()) > 0) {
    console.log('• Users already exist — skipping demo data');
    return;
  }
  await seedDemo();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
