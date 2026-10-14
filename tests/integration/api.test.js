const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { app, server, startServer, stopServer } = require('../../backend/server');

let testPort;
let baseUrl;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: testPort,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

test('API Integration Suite', async (t) => {
  // Start server on a dynamic test port
  await startServer(0);
  testPort = server.address().port;
  baseUrl = `http://127.0.0.1:${testPort}`;

  t.after(async () => {
    await stopServer();
  });

  await t.test('GET /api/health returns status UP and database metrics', async () => {
    const res = await makeRequest('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.status, 'UP');
    assert.ok(res.data.database.registered_bins >= 6);
  });

  await t.test('GET /api/bins returns registered bins array', async () => {
    const res = await makeRequest('GET', '/api/bins');
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(Array.isArray(res.data.data));
    assert.ok(res.data.data.length >= 6);
  });

  await t.test('POST /api/bins/data ingests valid sensor reading', async () => {
    const payload = {
      bin_id: 'BIN-001',
      distance_cm: 22.5,
      sensor_valid: true,
      source: 'test'
    };

    const res = await makeRequest('POST', '/api/bins/data', payload);
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);

    const bin = res.data.data.bin;
    assert.equal(bin.id, 'BIN-001');
    assert.equal(bin.fill_percentage, 50.0);
    assert.equal(bin.status, 'MEDIUM');
    assert.equal(bin.is_online, true);
  });

  await t.test('POST /api/bins/data handles invalid sensor measurement gracefully', async () => {
    const payload = {
      bin_id: 'BIN-001',
      distance_cm: -1,
      sensor_valid: false,
      source: 'test'
    };

    const res = await makeRequest('POST', '/api/bins/data', payload);
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);

    const bin = res.data.data.bin;
    assert.equal(bin.status, 'SENSOR ERROR');
    assert.equal(bin.sensor_valid, false);
    assert.equal(bin.fill_percentage, null);
  });

  await t.test('POST /api/bins validates empty distance > full distance', async () => {
    const invalidBin = {
      id: 'BIN-INVALID',
      name: 'Test Invalid',
      location: 'Test Location',
      empty_distance: 5.0,
      full_distance: 40.0 // Invalid! Full > Empty
    };

    const res = await makeRequest('POST', '/api/bins', invalidBin);
    assert.equal(res.status, 400);
    assert.equal(res.data.success, false);
    assert.ok(res.data.error.includes('Empty distance must be greater than full distance'));
  });

  await t.test('GET /api/alerts returns alerts list', async () => {
    const res = await makeRequest('GET', '/api/alerts?includeResolved=true');
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(Array.isArray(res.data.data));
  });

  await t.test('GET /api/analytics returns aggregated statistics', async () => {
    const res = await makeRequest('GET', '/api/analytics');
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(typeof res.data.data.summary.average_fill_percentage === 'number');
    assert.ok(Array.isArray(res.data.data.status_distribution));
  });
});
