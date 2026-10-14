const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../../backend/database/db');
const staleDeviceMonitor = require('../../backend/services/staleDeviceMonitor');

test('Stale Device Monitor Suite', async (t) => {
  const staleBinId = 'BIN-STALE-TEST';

  db.createBin({
    id: staleBinId,
    name: 'Stale Test Bin',
    location: 'Remote Corner',
    empty_distance: 40.0,
    full_distance: 5.0
  });

  t.after(() => {
    db.deleteBin(staleBinId);
  });

  await t.test('Flags bin as OFFLINE when telemetry age exceeds timeout', () => {
    const settings = db.getSettings();
    const timeoutMs = (settings.offline_timeout_sec || 60) * 1000;

    // Set last_reading_time to 2 minutes in the past
    const oldTimestamp = new Date(Date.now() - (timeoutMs + 20000)).toISOString();
    db.updateBin(staleBinId, {
      is_online: true,
      status: 'LOW',
      last_reading_time: oldTimestamp
    });

    // Run stale check cycle
    staleDeviceMonitor.checkStaleDevices();

    const checkedBin = db.getBinById(staleBinId);
    assert.equal(checkedBin.is_online, false, 'Bin should be marked is_online = false');
    assert.equal(checkedBin.status, 'OFFLINE', 'Bin status should become OFFLINE');

    const offlineAlert = db.getAlerts(false).find(a => a.bin_id === staleBinId && a.type === 'DEVICE_OFFLINE');
    assert.ok(offlineAlert, 'Offline alert should be triggered for timed-out node');
  });
});
