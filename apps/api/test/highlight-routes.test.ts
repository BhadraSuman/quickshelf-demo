import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import type { FastifyInstance } from 'fastify';

describe('Highlight ESL Cloud Integration Routes', () => {
  let app: FastifyInstance;

  before(async () => {
    app = await createServer();
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  it('GET /api/highlight/status should return connected status for CU006INDIA0344', async () => {
    // Give 500ms breather in case previous tests ran
    await new Promise((r) => setTimeout(r, 600));

    const res = await app.inject({
      method: 'GET',
      url: '/api/highlight/status',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    if (!body.success) {
      console.error('Status failed with:', body);
    }
    assert.equal(body.success, true);
    assert.equal(body.connected, true);
    assert.equal(body.organization, 'CU006INDIA0344');
    assert.ok(body.deviceTotal >= 0);
  });

  it('GET /api/highlight/devices should return real physical ESL devices', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/highlight/devices?pageSize=10',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.devices));
    assert.ok(body.devices.length > 0, 'Should return at least 1 physical device');

    const first = body.devices[0];
    assert.ok(first.deviceNumber, 'Device must have deviceNumber');
    assert.ok(first.stationId, 'Device must be associated with AP stationId');
  });

  it('GET /api/highlight/templates should return server e-paper templates', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/highlight/templates',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.templates));
    assert.ok(body.templates.length > 0, 'Should return templates');

    const templateIds = body.templates.map((t: any) => t.templateId);
    assert.ok(templateIds.includes(1212) || templateIds.includes(1213), 'Should include template 1212 or 1213');
  });

  it('POST /api/highlight/sync should perform fleet sync and return summary', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/highlight/sync',
      payload: {},
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.organization, 'CU006INDIA0344');
    assert.ok(Array.isArray(body.stations));
    assert.ok(Array.isArray(body.devices));
    assert.ok(Array.isArray(body.templates));
  });

  it('GET /api/highlight/export-devices-csv should return official CSV format', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/highlight/export-devices-csv',
    });

    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('*Barcode,Device name,Organization(CU006INDIA0344:483)'));
    assert.ok(res.body.includes('8003152970'));
  });

  it('GET /api/highlight/export-devices-xlsx should return valid Excel workbook', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/highlight/export-devices-xlsx',
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.ok(res.rawPayload.length > 500, 'Excel payload must contain data');
  });

  it('POST /api/highlight/import-devices-csv should parse Highlight format and update device', async () => {
    const csv = `Note
<1>Field name in red color is mandatory
<2>Revise device ID is prohibited
<3>Revise or delete organization ID is prohibited,,
Device information,,
*Barcode,Device name,Organization(CU006INDIA0344:483)
8003152970,Kalakand Master Display,CU006INDIA0344:483`;

    const res = await app.inject({
      method: 'POST',
      url: '/api/highlight/import-devices-csv',
      payload: { csvContent: csv },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(body.results.length >= 1);
    assert.equal(body.results[0].barcode, '8003152970');
  });
});
