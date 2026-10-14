const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyStatus,
  getRecommendedAction,
  getPriorityRank
} = require('../../backend/services/calculationService');

test('Threshold Classification Rules', (t) => {
  // 0 - 49%: LOW
  assert.equal(classifyStatus(0.0), 'LOW');
  assert.equal(classifyStatus(25.0), 'LOW');
  assert.equal(classifyStatus(49.9), 'LOW');

  // 50 - 79%: MEDIUM
  assert.equal(classifyStatus(50.0), 'MEDIUM');
  assert.equal(classifyStatus(65.0), 'MEDIUM');
  assert.equal(classifyStatus(79.9), 'MEDIUM');

  // 80 - 94%: HIGH (Collection Needed)
  assert.equal(classifyStatus(80.0), 'HIGH');
  assert.equal(classifyStatus(88.0), 'HIGH');
  assert.equal(classifyStatus(94.9), 'HIGH');

  // 95 - 100%: FULL (Urgent Collection)
  assert.equal(classifyStatus(95.0), 'FULL');
  assert.equal(classifyStatus(99.0), 'FULL');
  assert.equal(classifyStatus(100.0), 'FULL');
});

test('Fault & Offline Status Classification', (t) => {
  // Offline device
  assert.equal(classifyStatus(50.0, true, false), 'OFFLINE');

  // Sensor error (sensorValid = false or fill = null)
  assert.equal(classifyStatus(null, false, true), 'SENSOR ERROR');
  assert.equal(classifyStatus(null, true, true), 'SENSOR ERROR');
  assert.equal(classifyStatus(NaN, true, true), 'SENSOR ERROR');
});

test('Priority Ranking Order', (t) => {
  // 1 = FULL, 2 = HIGH, 3 = SENSOR ERROR, 4 = OFFLINE, 5 = MEDIUM, 6 = LOW
  const fullRank = getPriorityRank('FULL');
  const highRank = getPriorityRank('HIGH');
  const errorRank = getPriorityRank('SENSOR ERROR');
  const offlineRank = getPriorityRank('OFFLINE');
  const medRank = getPriorityRank('MEDIUM');
  const lowRank = getPriorityRank('LOW');

  assert.ok(fullRank < highRank, 'FULL should have higher priority than HIGH');
  assert.ok(highRank < errorRank, 'HIGH should have higher priority than SENSOR ERROR');
  assert.ok(errorRank < offlineRank, 'SENSOR ERROR should rank above OFFLINE');
  assert.ok(offlineRank < medRank, 'OFFLINE should rank above MEDIUM');
  assert.ok(medRank < lowRank, 'MEDIUM should rank above LOW');
});

test('Recommended Municipal Action Text', (t) => {
  const fullAction = getRecommendedAction('FULL', 98);
  assert.ok(fullAction.includes('URGENT DISPATCH'), 'FULL status should specify urgent dispatch');

  const errorAction = getRecommendedAction('SENSOR ERROR');
  assert.ok(errorAction.includes('HC-SR04'), 'SENSOR ERROR should mention sensor check');

  const offlineAction = getRecommendedAction('OFFLINE');
  assert.ok(offlineAction.includes('ESP8266'), 'OFFLINE should mention ESP8266 check');
});
