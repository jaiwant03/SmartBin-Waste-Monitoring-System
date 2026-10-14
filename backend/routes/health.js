/**
 * Health API Route
 * Provides system status, uptime, database verification, and connected clients
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');

module.exports = function (io) {
  router.get('/', (req, res) => {
    try {
      const bins = db.getBins();
      const alerts = db.getAlerts(true);
      const readings = db.getAllRecentReadings();
      const connectedSockets = io ? io.engine.clientsCount : 0;

      return res.json({
        success: true,
        status: 'UP',
        system: 'SmartBin Municipal Waste Monitoring Backend',
        version: '1.0.0',
        uptime_seconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          status: 'CONNECTED',
          registered_bins: bins.length,
          historical_readings: readings.length,
          total_alerts: alerts.length
        },
        realtime: {
          connected_clients: connectedSockets
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, status: 'DOWN', error: err.message });
    }
  });

  return router;
};
