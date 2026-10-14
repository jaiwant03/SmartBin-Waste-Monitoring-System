/**
 * Alert Management Service for SmartBin
 * Handles threshold evaluation, deduplication, auto-resolution, and Socket.IO notifications
 */

const db = require('../database/db');

class AlertService {
  constructor() {
    this.io = null;
  }

  setSocketIO(ioInstance) {
    this.io = ioInstance;
  }

  /**
   * Process and evaluate alerts for a bin based on new status/reading
   * @param {object} bin - The updated bin record
   */
  processBinAlerts(bin) {
    if (!bin) return;

    const { id, location, status, fill_percentage, is_online, sensor_valid } = bin;

    // 1. Device Offline / Online transitions
    if (!is_online || status === 'OFFLINE') {
      if (!db.hasActiveAlert(id, 'DEVICE_OFFLINE')) {
        const alert = db.addAlert({
          bin_id: id,
          type: 'DEVICE_OFFLINE',
          severity: 'warning',
          message: `Communication Lost: Bin ${id} at ${location} has gone offline.`,
          location,
          fill_percentage: fill_percentage
        });
        if (this.io) this.io.emit('alert:new', alert);
      }
      return; // Offline bins do not process fill-level capacity alerts until reconnected
    } else {
      // If was offline and is now online, resolve offline alerts
      const resolved = db.resolveActiveAlertsForBin(id, 'DEVICE_OFFLINE');
      if (resolved > 0 && this.io) {
        this.io.emit('alert:resolved', { bin_id: id, type: 'DEVICE_OFFLINE' });
      }
    }

    // 2. Sensor Error handling
    if (!sensor_valid || status === 'SENSOR ERROR') {
      if (!db.hasActiveAlert(id, 'SENSOR_ERROR')) {
        const alert = db.addAlert({
          bin_id: id,
          type: 'SENSOR_ERROR',
          severity: 'warning',
          message: `Sensor Hardware Error: Bin ${id} at ${location} returned invalid ultrasonic reading.`,
          location,
          fill_percentage: null
        });
        if (this.io) this.io.emit('alert:new', alert);
      }
      return;
    } else {
      // Sensor reading is valid, resolve any previous sensor error alerts
      const resolved = db.resolveActiveAlertsForBin(id, 'SENSOR_ERROR');
      if (resolved > 0 && this.io) {
        this.io.emit('alert:resolved', { bin_id: id, type: 'SENSOR_ERROR' });
      }
    }

    // 3. Capacity / Fill Level Alerts
    if (status === 'FULL') {
      // Bin reached critical threshold (>=95%)
      // Auto-resolve any lesser COLLECTION_NEEDED alert to avoid clutter
      db.resolveActiveAlertsForBin(id, 'COLLECTION_NEEDED');

      if (!db.hasActiveAlert(id, 'URGENT_FULL')) {
        const alert = db.addAlert({
          bin_id: id,
          type: 'URGENT_FULL',
          severity: 'critical',
          message: `CRITICAL OVERFLOW ALERT: Bin ${id} at ${location} is ${fill_percentage}% full! Immediate collection required.`,
          location,
          fill_percentage
        });
        if (this.io) this.io.emit('alert:new', alert);
      }
    } else if (status === 'HIGH') {
      // Bin reached collection threshold (80-94%)
      // If it dropped from FULL, resolve URGENT_FULL
      db.resolveActiveAlertsForBin(id, 'URGENT_FULL');

      if (!db.hasActiveAlert(id, 'COLLECTION_NEEDED')) {
        const alert = db.addAlert({
          bin_id: id,
          type: 'COLLECTION_NEEDED',
          severity: 'warning',
          message: `Collection Required: Bin ${id} at ${location} reached ${fill_percentage}% fill capacity.`,
          location,
          fill_percentage
        });
        if (this.io) this.io.emit('alert:new', alert);
      }
    } else if (status === 'LOW' || status === 'MEDIUM') {
      // Garbage collected or fill level safe -> auto-resolve capacity alerts
      const resolvedUrgent = db.resolveActiveAlertsForBin(id, 'URGENT_FULL');
      const resolvedHigh = db.resolveActiveAlertsForBin(id, 'COLLECTION_NEEDED');

      if ((resolvedUrgent > 0 || resolvedHigh > 0) && this.io) {
        this.io.emit('alert:resolved', { bin_id: id });
      }
    }
  }

  /**
   * Manually resolve an alert by ID
   */
  resolveAlert(alertId) {
    const resolved = db.resolveAlert(alertId);
    if (resolved && this.io) {
      this.io.emit('alert:resolved', resolved);
    }
    return resolved;
  }
}

const alertService = new AlertService();
module.exports = alertService;
