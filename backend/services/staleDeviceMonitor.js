/**
 * Stale Device Monitor Service
 * Periodically checks for bins that haven't sent readings within the configured offline timeout.
 * Marks them as OFFLINE / STALE DATA and fires appropriate alerts.
 */

const db = require('../database/db');
const alertService = require('./alertService');
const { getRecommendedAction, getPriorityRank } = require('./calculationService');

class StaleDeviceMonitor {
  constructor() {
    this.interval = null;
    this.io = null;
    this.checkIntervalMs = 5000; // Check every 5 seconds
  }

  start(ioInstance) {
    this.io = ioInstance;
    if (this.interval) clearInterval(this.interval);

    this.interval = setInterval(() => {
      this.checkStaleDevices();
    }, this.checkIntervalMs);

    console.log('[StaleDeviceMonitor] Started background check (every 5s).');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  checkStaleDevices() {
    const settings = db.getSettings();
    const timeoutMs = (settings.offline_timeout_sec || 60) * 1000;
    const now = Date.now();
    const bins = db.getBins();

    bins.forEach(bin => {
      if (!bin.last_reading_time) return;

      const lastSeen = new Date(bin.last_reading_time).getTime();
      const timeSinceLastReading = now - lastSeen;

      if (bin.is_online && timeSinceLastReading > timeoutMs) {
        // Device transitioned from ONLINE to OFFLINE
        const updated = db.updateBin(bin.id, {
          is_online: false,
          status: 'OFFLINE',
          action: getRecommendedAction('OFFLINE'),
          priority: getPriorityRank('OFFLINE')
        });

        console.log(`[StaleDeviceMonitor] Bin ${bin.id} timed out after ${Math.round(timeSinceLastReading / 1000)}s -> marked OFFLINE`);

        // Trigger alert service
        alertService.processBinAlerts(updated);

        // Notify frontend in real-time
        if (this.io) {
          this.io.emit('bin:status-change', {
            bin_id: bin.id,
            status: 'OFFLINE',
            is_online: false,
            updated
          });
          this.io.emit('bin:update', updated);
        }
      }
    });
  }
}

const staleDeviceMonitor = new StaleDeviceMonitor();
module.exports = staleDeviceMonitor;
