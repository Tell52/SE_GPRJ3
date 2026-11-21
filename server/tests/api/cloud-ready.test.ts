import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, describe, expect, test, vi } from 'vitest';
import { loadTestEnvironment } from '../helpers/test-database.js';

const env = loadTestEnvironment() as unknown as { DATABASE_URL: string };
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.NODE_ENV = 'test';
const { createApp } = await import('../../src/app.js');
const { prisma: appPrisma } = await import('../../src/db.js');

afterAll(async () => { await appPrisma.$disconnect(); });

describe('Lab 5 health and readiness endpoints', () => {
  test('GET /api/health answers 200 without a session or database', async () => {
    const response = await request(createApp()).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  test('GET /api/ready answers 200 when PostgreSQL responds', async () => {
    const response = await request(createApp()).get('/api/ready');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', db: 'connected' });
  });

  test('GET /api/ready answers 503 when the database cannot be reached', async () => {
    const query = vi.spyOn(appPrisma, '$queryRaw').mockRejectedValueOnce(new Error('connection refused'));
    try {
      const response = await request(createApp()).get('/api/ready');
      expect(response.status).toBe(503);
      expect(response.body).toEqual({ status: 'unavailable', db: 'disconnected' });
    } finally { query.mockRestore(); }
  });
});

describe('Lab 5 production serving of the built client', () => {
  const dist = mkdtempSync(path.join(tmpdir(), 'client-dist-'));
  writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>Event Planner</title>');
  writeFileSync(path.join(dist, 'app.js'), 'console.log("ok")');
  afterAll(() => { rmSync(dist, { recursive: true, force: true }); });

  function productionApp() {
    const saved = { NODE_ENV: process.env.NODE_ENV, CLIENT_DIST: process.env.CLIENT_DIST };
    process.env.NODE_ENV = 'production';
    process.env.CLIENT_DIST = dist;
    try { return createApp(); } finally {
      process.env.NODE_ENV = saved.NODE_ENV;
      if (saved.CLIENT_DIST === undefined) delete process.env.CLIENT_DIST; else process.env.CLIENT_DIST = saved.CLIENT_DIST;
    }
  }

  test('serves index.html at / and for client routes, and static assets by path', async () => {
    const app = productionApp();
    for (const route of ['/', '/events/5', '/organizer/events/new']) {
      const response = await request(app).get(route);
      expect(response.status).toBe(200);
      expect(response.text).toContain('<title>Event Planner</title>');
    }
    const asset = await request(app).get('/app.js');
    expect(asset.status).toBe(200);
    expect(asset.text).toContain('console.log');
  });

  test('unknown API paths still return the JSON 404, never the web page', async () => {
    const response = await request(productionApp()).get('/api/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  test('outside production the client is not served', async () => {
    process.env.CLIENT_DIST = dist;
    try {
      const response = await request(createApp()).get('/');
      expect(response.status).toBe(404);
    } finally { delete process.env.CLIENT_DIST; }
  });
});