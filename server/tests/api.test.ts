/**
 * API integration tests against the configured PostgreSQL database.
 * Each run creates throwaway users (cleaned up afterwards) and uses the mock weather provider.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/database/prisma.js';
import type { SmsProvider } from '../src/services/sms/types.js';
import { smsService } from '../src/services/smsService.js';

const app = createApp();
const run = Date.now().toString(36);
const emailA = `test-a-${run}@example.com`;
const emailB = `test-b-${run}@example.com`;
const sent: { to: string; body: string }[] = [];
const fakeSms: SmsProvider = {
  name: 'fake',
  async send(to, body) {
    sent.push({ to, body });
    return { delivered: true, simulated: false, provider: 'fake' };
  },
};

let agentA: ReturnType<typeof request.agent>;
let agentB: ReturnType<typeof request.agent>;
let farmId: string;
let fieldId: string;
let tomatoId: string;
let plantingId: string;

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

beforeAll(async () => {
  smsService.useProvider(fakeSms);
  agentA = request.agent(app);
  agentB = request.agent(app);
  tomatoId = (await prisma.cropType.findUniqueOrThrow({ where: { name: 'Tomato' } })).id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
  await prisma.$disconnect();
});

describe('auth', () => {
  it('registers, rejects duplicates and weak passwords', async () => {
    const res = await agentA.post('/api/auth/register').send({ name: 'Ada Grower', email: emailA, password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.headers['set-cookie'][0]).toMatch(/ht_session=.*HttpOnly/);

    expect((await request(app).post('/api/auth/register').send({ name: 'Dup', email: emailA, password: 'secret123' })).status).toBe(409);
    expect((await request(app).post('/api/auth/register').send({ name: 'Weak', email: 'w@x.io', password: 'short' })).status).toBe(400);
  });

  it('stores only a bcrypt hash', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: emailA } });
    expect(user.passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('rejects bad credentials and unauthenticated requests', async () => {
    expect((await request(app).post('/api/auth/login').send({ email: emailA, password: 'wrong-pass1' })).status).toBe(401);
    expect((await request(app).get('/api/plantings')).status).toBe(401);
    expect((await request(app).get('/api/plantings').set('Authorization', 'Bearer not-a-token')).status).toBe(401);
  });

  it('logs in a second user', async () => {
    await agentB.post('/api/auth/register').send({ name: 'Ben Grower', email: emailB, password: 'secret123' }).expect(201);
  });
});

describe('farms, fields and plantings', () => {
  it('creates a farm and field', async () => {
    const farm = await agentA.post('/api/farms').send({ name: 'Test Farm', location: 'Columbus, Ohio', latitude: 39.96, longitude: -83 });
    expect(farm.status).toBe(201);
    farmId = farm.body.farm.id;
    const field = await agentA.post('/api/fields').send({ farmId, name: 'North Field', areaAcres: 10 });
    expect(field.status).toBe(201);
    fieldId = field.body.field.id;
    expect((await agentA.post('/api/fields').send({ farmId, name: 'North Field' })).status).toBe(409);
  });

  it('records a planting with an estimated harvest window', async () => {
    const res = await agentA.post('/api/plantings').send({
      cropTypeId: tomatoId, farmId, fieldId, variety: 'Roma', plantingDate: daysAgo(30), notes: 'Test',
    });
    expect(res.status).toBe(201);
    plantingId = res.body.planting.id;
    expect(res.body.planting.progress.daysGrowing).toBe(30);
    expect(res.body.planting.estimatedHarvestStart).toBe(daysAgo(30 - 60));
    expect(res.body.planting.activities[0].type).toBe('PLANTED');
  });

  it('can create a field inline from the planting form', async () => {
    const res = await agentA.post('/api/plantings').send({ cropTypeId: tomatoId, farmId, newFieldName: 'Greenhouse', plantingDate: daysAgo(5) });
    expect(res.status).toBe(201);
    expect(res.body.planting.field.name).toBe('Greenhouse');
  });

  it('validates planting input', async () => {
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
    expect((await agentA.post('/api/plantings').send({ cropTypeId: tomatoId, farmId, fieldId, plantingDate: future })).status).toBe(400);
    expect((await agentA.post('/api/plantings').send({ cropTypeId: tomatoId, farmId, fieldId, plantingDate: '2026-02-30' })).status).toBe(400);
    expect((await agentA.post('/api/plantings').send({ farmId, fieldId, plantingDate: daysAgo(1) })).status).toBe(400);
  });

  it('rejects a field that belongs to a different farm', async () => {
    const other = await agentA.post('/api/farms').send({ name: 'Other Farm', location: 'Dayton, Ohio', latitude: 39.7, longitude: -84.2 });
    const res = await agentA.post('/api/plantings').send({ cropTypeId: tomatoId, farmId: other.body.farm.id, fieldId, plantingDate: daysAgo(3) });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/does not belong/);
  });

  it('recalculates the estimate when the planting date changes', async () => {
    const res = await agentA.put(`/api/plantings/${plantingId}`).send({ plantingDate: daysAgo(40) });
    expect(res.status).toBe(200);
    expect(res.body.planting.estimatedHarvestStart).toBe(daysAgo(40 - 60));
  });
});

describe('data isolation between users', () => {
  it("hides another user's records", async () => {
    expect((await agentB.get(`/api/plantings/${plantingId}`)).status).toBe(404);
    expect((await agentB.put(`/api/plantings/${plantingId}`).send({ notes: 'hijack' })).status).toBe(404);
    expect((await agentB.delete(`/api/plantings/${plantingId}`)).status).toBe(404);
    expect((await agentB.post('/api/fields').send({ farmId, name: 'Sneaky' })).status).toBe(404);
    expect((await agentB.get('/api/farms')).body.farms).toEqual([]);
    expect((await agentB.get('/api/plantings')).body.plantings).toEqual([]);
  });

  it("prevents planting into another user's farm", async () => {
    const res = await agentB.post('/api/plantings').send({ cropTypeId: tomatoId, farmId, fieldId, plantingDate: daysAgo(2) });
    expect(res.status).toBe(404);
  });
});

describe('weather, hazard detection and SMS', () => {
  it('returns a normalised forecast for the farm', async () => {
    const res = await agentA.get(`/api/weather?farmId=${farmId}`);
    expect(res.status).toBe(200);
    expect(res.body.weather.daily).toHaveLength(7);
    expect(res.body.weather.current).toHaveProperty('temperatureC');
  });

  it('validates phone numbers before enabling SMS', async () => {
    const bad = await agentA.put('/api/settings/notifications').send({ phoneNumber: '12345', smsEnabled: true, minimumSeverity: 'HIGH' });
    expect(bad.status).toBe(400);
    const none = await agentA.put('/api/settings/notifications').send({ phoneNumber: '', smsEnabled: true, minimumSeverity: 'HIGH' });
    expect(none.status).toBe(400);
    const ok = await agentA
      .put('/api/settings/notifications')
      .send({ phoneNumber: '+1 (555) 010-2030', smsEnabled: true, minimumSeverity: 'MODERATE' });
    expect(ok.status).toBe(200);
    expect(ok.body.preferences.phoneNumber).toBe('+15550102030');
  });

  it('creates alerts from the forecast, sends one SMS and de-duplicates on rescan', async () => {
    // Creating plantings already triggers a background scan; start from a clean slate.
    const user = await prisma.user.findUniqueOrThrow({ where: { email: emailA } });
    await prisma.alert.deleteMany({ where: { userId: user.id } });
    sent.length = 0;
    const first = await agentA.post('/api/alerts/scan');
    expect(first.status).toBe(200);
    expect(first.body.result.alertsCreated).toBeGreaterThan(0);

    const alerts = (await agentA.get('/api/alerts')).body.alerts;
    expect(alerts.some((a: { alertType: string }) => a.alertType === 'HEAVY_RAIN')).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('+15550102030');
    expect(sent[0].body).toMatch(/^HarvestTrack Alert:/);

    const second = await agentA.post('/api/alerts/scan');
    expect(second.body.result.alertsCreated).toBe(0);
    expect(sent).toHaveLength(1);
  });

  it('marks alerts as read, scoped to the owner', async () => {
    const [alert] = (await agentA.get('/api/alerts')).body.alerts;
    expect((await agentB.patch(`/api/alerts/${alert.id}/read`)).status).toBe(404);
    const res = await agentA.patch(`/api/alerts/${alert.id}/read`);
    expect(res.status).toBe(200);
    expect(res.body.alert.readAt).toBeTruthy();
  });
});

describe('harvest recording', () => {
  it('validates harvest input', async () => {
    expect((await agentA.post(`/api/plantings/${plantingId}/harvest`).send({ actualHarvestDate: daysAgo(1), quantity: -5, unit: 'KG', quality: 'GOOD' })).status).toBe(400);
    expect((await agentA.post(`/api/plantings/${plantingId}/harvest`).send({ actualHarvestDate: daysAgo(60), quantity: 5, unit: 'KG', quality: 'GOOD' })).status).toBe(400);
  });

  it('records a harvest and marks the planting harvested', async () => {
    const res = await agentA.post(`/api/plantings/${plantingId}/harvest`).send({ actualHarvestDate: daysAgo(0), quantity: 120.5, unit: 'CRATES', quality: 'EXCELLENT' });
    expect(res.status).toBe(201);
    const planting = (await agentA.get(`/api/plantings/${plantingId}`)).body.planting;
    expect(planting.status).toBe('HARVESTED');
    expect(planting.displayStatus).toBe('HARVESTED');
    expect(planting.harvest.quantity).toBe(120.5);
    expect((await agentA.post(`/api/plantings/${plantingId}/harvest`).send({ actualHarvestDate: daysAgo(0), quantity: 1, unit: 'KG', quality: 'GOOD' })).status).toBe(409);
  });

  it('appears in harvest history and the dashboard', async () => {
    const history = (await agentA.get('/api/harvests')).body;
    expect(history.records.some((r: { id: string }) => r.id === plantingId)).toBe(true);
    const summary = (await agentA.get('/api/dashboard/summary')).body;
    expect(summary.kpis.totalHarvests).toBe(1);
  });
});
