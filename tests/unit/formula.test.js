const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateFillPercentage } = require('../../backend/services/calculationService');

test('Fill Percentage Formula — Standard Scenarios', (t) => {
  // Scenario A: Empty Bin (40 cm -> 0%)
  const fillEmpty = calculateFillPercentage(40.0, 40.0, 5.0);
  assert.equal(fillEmpty, 0.0, '40 cm distance should equal 0.0% fill');

  // Scenario B: Half-Filled Bin (22.5 cm -> 50%)
  const fillHalf = calculateFillPercentage(22.5, 40.0, 5.0);
  assert.equal(fillHalf, 50.0, '22.5 cm distance should equal 50.0% fill');

  // Scenario C: Nearly Full Bin (8.5 cm -> 90%)
  const fillNearlyFull = calculateFillPercentage(8.5, 40.0, 5.0);
  assert.equal(fillNearlyFull, 90.0, '8.5 cm distance should equal 90.0% fill');

  // Scenario D: Completely Full Bin (5.0 cm -> 100%)
  const fillFull = calculateFillPercentage(5.0, 40.0, 5.0);
  assert.equal(fillFull, 100.0, '5.0 cm distance should equal 100.0% fill');
});

test('Fill Percentage Formula — Clamping Behavior', (t) => {
  // Distance greater than empty bin (e.g. 42 cm within tolerance)
  const clampedLow = calculateFillPercentage(42.0, 40.0, 5.0);
  assert.equal(clampedLow, 0.0, 'Distance exceeding empty height should clamp to 0.0%');

  // Distance smaller than full clearance (e.g. 3.0 cm overflow)
  const clampedHigh = calculateFillPercentage(3.0, 40.0, 5.0);
  assert.equal(clampedHigh, 100.0, 'Distance less than full clearance should clamp to 100.0%');
});

test('Fill Percentage Formula — Invalid Distance Rejection', (t) => {
  // Negative distance (sensor timeout / error)
  assert.equal(calculateFillPercentage(-1.0, 40.0, 5.0), null, 'Negative distance must return null');

  // Zero distance
  assert.equal(calculateFillPercentage(0, 40.0, 5.0), null, 'Zero distance must return null');

  // Exceeds empty height + tolerance (void / lost reflection)
  assert.equal(calculateFillPercentage(65.0, 40.0, 5.0), null, 'Distance beyond tolerance must return null');

  // Non-finite / missing values
  assert.equal(calculateFillPercentage(NaN, 40.0, 5.0), null, 'NaN distance must return null');
  assert.equal(calculateFillPercentage(null, 40.0, 5.0), null, 'null distance must return null');
  assert.equal(calculateFillPercentage(undefined, 40.0, 5.0), null, 'undefined distance must return null');
});

test('Fill Percentage Formula — Invalid Reference Distances', (t) => {
  // Empty distance <= Full distance
  assert.equal(calculateFillPercentage(20.0, 10.0, 20.0), null, 'Empty <= Full must return null');
  assert.equal(calculateFillPercentage(20.0, 20.0, 20.0), null, 'Empty == Full must return null');
});
