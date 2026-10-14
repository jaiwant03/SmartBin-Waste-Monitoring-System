/**
 * Alerts API Routes
 * Endpoints for querying and resolving municipal alerts
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const alertService = require('../services/alertService');

module.exports = function (io) {
  /**
   * GET /api/alerts
   * Returns alerts. Query ?includeResolved=true includes past alerts.
   */
  router.get('/', (req, res) => {
    try {
      const includeResolved = req.query.includeResolved === 'true';
      const alerts = db.getAlerts(includeResolved);
      return res.json({
        success: true,
        count: alerts.length,
        data: alerts
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * PATCH /api/alerts/:id/resolve
   * Resolves a specific alert
   */
  router.patch('/:id/resolve', (req, res) => {
    try {
      const alertId = req.params.id;
      const resolved = alertService.resolveAlert(alertId);

      if (!resolved) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found.'
        });
      }

      return res.json({
        success: true,
        message: 'Alert resolved successfully.',
        data: resolved
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
