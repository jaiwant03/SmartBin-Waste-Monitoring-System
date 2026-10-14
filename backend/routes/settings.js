/**
 * Settings API Routes
 * Endpoints for retrieving and updating global system parameters
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const simulationEngine = require('../services/simulationEngine');

router.get('/', (req, res) => {
  return res.json({
    success: true,
    data: db.getSettings()
  });
});

router.put('/', (req, res) => {
  try {
    const updates = req.body;

    if (updates.empty_distance && updates.full_distance) {
      if (Number(updates.empty_distance) <= Number(updates.full_distance)) {
        return res.status(400).json({
          success: false,
          error: 'Empty reference distance must be strictly greater than full reference distance.'
        });
      }
    }

    const updated = db.updateSettings(updates);

    if (updates.simulation_interval_sec) {
      simulationEngine.setIntervalSeconds(updates.simulation_interval_sec);
    }

    return res.json({
      success: true,
      message: 'System settings updated successfully.',
      data: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
