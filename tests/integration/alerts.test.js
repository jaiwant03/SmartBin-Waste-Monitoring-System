const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../../backend/database/db');
const alertService = require('../../backend/services/alertService');

test('Alert Management & Deduplication Suite', async (t) => {
  const testBinId = 'BIN-TEST-ALERT';

  // Setup test bin
  db.createBin({
    id: testBinId,
    name: 'Alert Test Bin',
    location: 'Testing Ground',
    empty_distance: 40.0,
    full_distance: 5.0,
    collection_threshold: 80,
    urgent_threshold: 95
  });

  t.after(() => {
    db.deleteBin(testBinId);
  });

  await t.test('Creates critical alert when bin becomes FULL and deduplicates on repeat', () => {
    // 1. Send reading: 5 cm (100% full)
    const updatedBin = db.updateBin(testBinId, {
      status: 'FULL',
      fill_percentage: 100.0,
      sensor_valid: true,
      is_online: true
    });

    alertService.processBinAlerts(updatedBin);

    const activeAlerts1 = db.getAlerts(false).filter(a => a.bin_id === testBinId && a.type === 'URGENT_FULL');
    assert.equal(activeAlerts1.length, 1, 'Should create exactly 1 URGENT_FULL alert');

    // 2. Send repeat reading: 5 cm again (100% full)
    alertService.processBinAlerts(updatedBin);

    const activeAlerts2 = db.getAlerts(false).filter(a => a.bin_id === testBinId && a.type === 'URGENT_FULL');
    assert.equal(activeAlerts2.length, 1, 'Should NOT create duplicate alert for continuing condition');
  });

  await t.test('Auto-resolves capacity alerts when bin is collected (fill drops to LOW)', () => {
    const emptiedBin = db.updateBin(testBinId, {
      status: 'LOW',
      fill_percentage: 10.0,
      sensor_valid: true,
      is_online: true
    });

    alertService.processBinAlerts(emptiedBin);

    const activeAlerts = db.getAlerts(false).filter(a => a.bin_id === testBinId && (a.type === 'URGENT_FULL' || a.type === 'COLLECTION_NEEDED'));
    assert.equal(activeAlerts.length, 0, 'Capacity alerts must be auto-resolved when bin is emptied');
  });

  await t.test('Creates DEVICE_OFFLINE alert when device disconnects', () => {
    const offlineBin = db.updateBin(testBinId, {
      status: 'OFFLINE',
      is_online: false
    });

    alertService.processBinAlerts(offlineBin);

    const offlineAlerts = db.getAlerts(false).filter(a => a.bin_id === testBinId && a.type === 'DEVICE_OFFLINE');
    assert.equal(offlineAlerts.length, 1, 'Must create DEVICE_OFFLINE alert');

    // Reconnect device
    const reconnectedBin = db.updateBin(testBinId, {
      status: 'LOW',
      is_online: true,
      sensor_valid: true,
      fill_percentage: 20.0
    });

    alertService.processBinAlerts(reconnectedBin);

    const activeOffline = db.getAlerts(false).filter(a => a.bin_id === testBinId && a.type === 'DEVICE_OFFLINE');
    assert.equal(activeOffline.length, 0, 'DEVICE_OFFLINE alert must be auto-resolved upon reconnection');
  });
});
