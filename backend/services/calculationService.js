/**
 * Calculation and Validation Service for SmartBin
 * Shared business logic for distance -> fill percentage and status classification
 */

const DEFAULT_CONFIG = {
  EMPTY_DISTANCE_CM: 40.0,
  FULL_DISTANCE_CM: 5.0,
  TOLERANCE_CM: 10.0, // Allow up to emptyDistance + tolerance before marking physically invalid
  COLLECTION_THRESHOLD: 80, // %
  URGENT_THRESHOLD: 95 // %
};

/**
 * Calculates fill percentage from ultrasonic sensor distance.
 * Formula: Fill % = ((Empty Distance - Measured Distance) / (Empty Distance - Full Distance)) * 100
 *
 * @param {number} distance - Distance in cm from sensor to garbage surface
 * @param {number} emptyDistance - Distance when bin is completely empty
 * @param {number} fullDistance - Distance when bin is completely full
 * @returns {number|null} Clamped fill percentage between 0 and 100, or null if invalid
 */
function calculateFillPercentage(distance, emptyDistance = DEFAULT_CONFIG.EMPTY_DISTANCE_CM, fullDistance = DEFAULT_CONFIG.FULL_DISTANCE_CM) {
  // 1. Validate reference distances
  if (typeof emptyDistance !== 'number' || typeof fullDistance !== 'number') return null;
  if (isNaN(emptyDistance) || isNaN(fullDistance)) return null;
  if (emptyDistance <= fullDistance) {
    // Physically invalid bin dimensions
    return null;
  }

  // 2. Validate measured distance
  if (distance === null || distance === undefined) return null;
  const numDistance = Number(distance);
  if (isNaN(numDistance) || !isFinite(numDistance)) return null;

  // HC-SR04 ultrasonic physical limits:
  // Zero or negative distance means sensor timeout, disconnected echo, or blind zone error
  if (numDistance <= 0) return null;

  // If distance exceeds empty bin height + tolerance (e.g. sensor pointing into open void or reflection error)
  const maxValidDistance = emptyDistance + DEFAULT_CONFIG.TOLERANCE_CM;
  if (numDistance > maxValidDistance) return null;

  // 3. Apply standard formula
  const usableHeight = emptyDistance - fullDistance;
  const garbageHeight = emptyDistance - numDistance;
  const rawPercentage = (garbageHeight / usableHeight) * 100;

  // 4. Clamp between 0% and 100%
  const clamped = Math.min(100, Math.max(0, rawPercentage));
  return Math.round(clamped * 10) / 10; // Round to 1 decimal place
}

/**
 * Classifies bin status based on fill percentage and validity.
 *
 * @param {number|null} fillPercentage
 * @param {boolean} sensorValid
 * @param {boolean} isOnline
 * @param {object} thresholds
 * @returns {'LOW'|'MEDIUM'|'HIGH'|'FULL'|'SENSOR ERROR'|'OFFLINE'}
 */
function classifyStatus(
  fillPercentage,
  sensorValid = true,
  isOnline = true,
  thresholds = {
    collection: DEFAULT_CONFIG.COLLECTION_THRESHOLD,
    urgent: DEFAULT_CONFIG.URGENT_THRESHOLD
  }
) {
  if (!isOnline) {
    return 'OFFLINE';
  }

  if (!sensorValid || fillPercentage === null || isNaN(fillPercentage)) {
    return 'SENSOR ERROR';
  }

  const urgentThreshold = thresholds.urgent ?? DEFAULT_CONFIG.URGENT_THRESHOLD;
  const collectionThreshold = thresholds.collection ?? DEFAULT_CONFIG.COLLECTION_THRESHOLD;

  if (fillPercentage >= urgentThreshold) {
    return 'FULL';
  }
  if (fillPercentage >= collectionThreshold) {
    return 'HIGH';
  }
  if (fillPercentage >= 50) {
    return 'MEDIUM';
  }
  return 'LOW';
}

/**
 * Recommended municipal action based on status and fill percentage
 */
function getRecommendedAction(status, fillPercentage = 0) {
  switch (status) {
    case 'FULL':
      return 'URGENT DISPATCH: Route waste collection vehicle immediately to prevent overflow.';
    case 'HIGH':
      return 'SCHEDULED DISPATCH: Add bin to current shift collection itinerary.';
    case 'MEDIUM':
      return 'NORMAL MONITORING: Capacity optimal. Projected collection in 24-48 hours.';
    case 'LOW':
      return 'HEALTHY: Adequate capacity available. No municipal action required.';
    case 'SENSOR ERROR':
      return 'MAINTENANCE REQUIRED: Sensor timeout or invalid reading. Check HC-SR04 transducer & wiring.';
    case 'OFFLINE':
      return 'COMMUNICATION FAILURE: ESP8266 node offline. Check power supply and Wi-Fi signal strength.';
    default:
      return 'Monitor bin status.';
  }
}

/**
 * Collection priority rank (1 = Highest / Most Urgent, 6 = Lowest)
 */
function getPriorityRank(status) {
  switch (status) {
    case 'FULL':
      return 1;
    case 'HIGH':
      return 2;
    case 'SENSOR ERROR':
      return 3;
    case 'OFFLINE':
      return 4;
    case 'MEDIUM':
      return 5;
    case 'LOW':
      return 6;
    default:
      return 7;
  }
}

module.exports = {
  DEFAULT_CONFIG,
  calculateFillPercentage,
  classifyStatus,
  getRecommendedAction,
  getPriorityRank
};
