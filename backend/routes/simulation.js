/**
 * Simulation API Routes
 * Endpoints for controlling the software sensor simulator and triggering test scenarios
 */

const express = require('express');
const router = express.Router();
const simulationEngine = require('../services/simulationEngine');

router.get('/status', (req, res) => {
  return res.json({
    success: true,
    data: simulationEngine.getStatus()
  });
});

router.post('/control', (req, res) => {
  try {
    const { action, scenario, bin_id, distance, interval_seconds } = req.body;

    switch (action) {
      case 'start':
      case 'resume':
        simulationEngine.start();
        break;

      case 'pause':
      case 'stop':
        simulationEngine.pause();
        break;

      case 'reset':
        simulationEngine.reset();
        break;

      case 'scenario':
        if (!scenario) {
          return res.status(400).json({ success: false, error: 'Scenario name is required.' });
        }
        simulationEngine.applyScenario(scenario, bin_id);
        break;

      case 'set_distance':
        if (distance === undefined || distance === null) {
          return res.status(400).json({ success: false, error: 'Distance is required.' });
        }
        simulationEngine.setManualDistance(bin_id || 'BIN-001', Number(distance), true);
        break;

      case 'simulate_error':
        simulationEngine.applyScenario('sensor_error', bin_id || 'BIN-001');
        break;

      case 'simulate_offline':
        simulationEngine.applyScenario('wifi_disconnect', bin_id || 'BIN-001');
        break;

      case 'set_interval':
        simulationEngine.setIntervalSeconds(interval_seconds || 4);
        break;

      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    }

    return res.json({
      success: true,
      message: `Simulation action '${action}' applied successfully.`,
      data: simulationEngine.getStatus()
    });
  } catch (err) {
    console.error('Error controlling simulation:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
