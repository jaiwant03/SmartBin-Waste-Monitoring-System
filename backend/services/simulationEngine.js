/**
 * Simulation Engine for SmartBin
 * Manages virtual sensor emulation, scenarios (A-H), failure injections, and interval broadcasts.
 */

const db = require('../database/db');
const { calculateFillPercentage, classifyStatus, getRecommendedAction, getPriorityRank } = require('./calculationService');
const alertService = require('./alertService');

class SimulationEngine {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.io = null;
    this.intervalSeconds = 4;
    this.selectedBinId = 'BIN-001';
    this.activeScenario = 'custom';
    this.currentSimulationState = {
      bin_id: 'BIN-001',
      distance_cm: 22.5,
      pulse_duration_us: 1313, // 22.5 cm * 58.31 us/cm
      fill_percentage: 50.0,
      status: 'MEDIUM',
      sensor_valid: true,
      wifi_connected: true,
      last_transmission: new Date().toISOString()
    };
  }

  init(ioInstance) {
    this.io = ioInstance;
    const settings = db.getSettings();
    this.intervalSeconds = settings.simulation_interval_sec || 4;

    if (settings.auto_simulation) {
      this.start();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.intervalId = setInterval(() => {
      this.tick();
    }, this.intervalSeconds * 1000);

    console.log(`[SimulationEngine] Started simulation loop (every ${this.intervalSeconds}s).`);
    this.broadcastSimulationStatus();
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[SimulationEngine] Simulation paused.');
    this.broadcastSimulationStatus();
  }

  resume() {
    this.start();
  }

  reset() {
    this.pause();
    db.resetToDefault();
    this.activeScenario = 'custom';
    const bin = db.getBinById('BIN-001') || db.getBins()[0];
    this.selectedBinId = bin.id;
    this.currentSimulationState = {
      bin_id: bin.id,
      distance_cm: 22.5,
      pulse_duration_us: Math.round(22.5 * 58.31),
      fill_percentage: 50.0,
      status: 'MEDIUM',
      sensor_valid: true,
      wifi_connected: true,
      last_transmission: new Date().toISOString()
    };
    this.start();
    console.log('[SimulationEngine] Simulation reset to default state.');
  }

  setIntervalSeconds(sec) {
    const val = Math.max(1, Math.min(60, Number(sec) || 4));
    this.intervalSeconds = val;
    db.updateSettings({ simulation_interval_sec: val });

    if (this.isRunning) {
      this.pause();
      this.start();
    }
    this.broadcastSimulationStatus();
  }

  /**
   * Applies pre-configured test scenarios (A through E)
   */
  applyScenario(scenarioName, binId = this.selectedBinId) {
    this.activeScenario = scenarioName;
    const targetBin = db.getBinById(binId) || db.getBins()[0];
    const emptyDist = targetBin.empty_distance || 40.0;
    const fullDist = targetBin.full_distance || 5.0;

    let distance = 22.5;
    let sensorValid = true;
    let wifiConnected = true;

    switch (scenarioName) {
      case 'empty': // Scenario A
        distance = emptyDist; // 40 cm
        break;
      case 'half': // Scenario B
        distance = fullDist + (emptyDist - fullDist) * 0.5; // 22.5 cm
        break;
      case 'nearly_full': // Scenario C
        distance = fullDist + (emptyDist - fullDist) * 0.1; // 8.5 cm
        break;
      case 'completely_full': // Scenario D
        distance = fullDist; // 5 cm
        break;
      case 'sensor_error': // Scenario E
        distance = -1;
        sensorValid = false;
        break;
      case 'wifi_disconnect': // Scenario F
        wifiConnected = false;
        break;
      default:
        break;
    }

    if (!wifiConnected) {
      // Simulate device dropped connection
      this.currentSimulationState = {
        ...this.currentSimulationState,
        bin_id: targetBin.id,
        wifi_connected: false,
        status: 'OFFLINE'
      };
      const updated = db.updateBin(targetBin.id, {
        is_online: false,
        status: 'OFFLINE',
        action: getRecommendedAction('OFFLINE'),
        priority: getPriorityRank('OFFLINE')
      });
      alertService.processBinAlerts(updated);
      if (this.io) {
        this.io.emit('bin:update', updated);
        this.io.emit('bin:status-change', { bin_id: targetBin.id, status: 'OFFLINE', is_online: false, updated });
      }
      this.broadcastSimulationStatus();
      return this.currentSimulationState;
    }

    // Process reading for target bin
    return this.processSimulatedReading(targetBin.id, distance, sensorValid, true);
  }

  setManualDistance(binId, distance, sensorValid = true) {
    this.activeScenario = 'manual';
    this.selectedBinId = binId;
    return this.processSimulatedReading(binId, Number(distance), sensorValid, true);
  }

  processSimulatedReading(binId, distance, sensorValid = true, isDirectUserAction = false) {
    const bin = db.getBinById(binId);
    if (!bin) return null;

    let fill = null;
    let status = 'SENSOR ERROR';

    if (sensorValid && distance > 0) {
      fill = calculateFillPercentage(distance, bin.empty_distance, bin.full_distance);
      if (fill !== null) {
        status = classifyStatus(fill, true, true, {
          collection: bin.collection_threshold,
          urgent: bin.urgent_threshold
        });
      } else {
        sensorValid = false;
        status = 'SENSOR ERROR';
      }
    } else {
      sensorValid = false;
      status = 'SENSOR ERROR';
    }

    const action = getRecommendedAction(status, fill || 0);
    const priority = getPriorityRank(status);
    const pulseDurationUs = sensorValid && distance > 0 ? Math.round(distance * 58.31) : 0;

    // Update database
    const updated = db.updateBin(bin.id, {
      distance_cm: distance,
      fill_percentage: fill,
      status,
      sensor_valid: sensorValid,
      is_online: true,
      priority,
      action,
      last_reading_time: new Date().toISOString()
    });

    // Add reading record
    const reading = db.addReading({
      bin_id: bin.id,
      distance_cm: distance,
      fill_percentage: fill,
      status,
      sensor_valid: sensorValid,
      source: 'simulation'
    });

    // Alert service evaluation
    alertService.processBinAlerts(updated);

    // Update live simulator state
    this.currentSimulationState = {
      bin_id: bin.id,
      distance_cm: distance,
      pulse_duration_us: pulseDurationUs,
      fill_percentage: fill,
      status,
      sensor_valid: sensorValid,
      wifi_connected: true,
      last_transmission: new Date().toISOString()
    };

    // Emit live Socket.IO events
    if (this.io) {
      this.io.emit('bin:update', updated);
      this.io.emit('reading:new', reading);
    }

    this.broadcastSimulationStatus();
    return updated;
  }

  tick() {
    // Background simulation loop:
    // Update bins progressively to show dynamic city behavior
    const bins = db.getBins().filter(b => b.is_online);
    if (bins.length === 0) return;

    // Pick one or two random online bins to generate a reading for
    const numToUpdate = Math.min(bins.length, Math.floor(Math.random() * 2) + 1);
    const shuffled = [...bins].sort(() => 0.5 - Math.random());

    for (let i = 0; i < numToUpdate; i++) {
      const bin = shuffled[i];
      if (!bin.sensor_valid) continue; // Keep sensor error bin in error unless changed

      // Small realistic progression: public bins fill up gradually (+0.5% to +2.5%)
      // If already >= 98%, simulate a municipal collection emptying the bin back to 5-10%!
      let currentFill = bin.fill_percentage ?? 20;
      let newFill;

      if (currentFill >= 98) {
        newFill = Math.round((Math.random() * 8 + 3) * 10) / 10; // Emptied
      } else {
        const delta = Math.round((Math.random() * 2.2 + 0.3) * 10) / 10;
        newFill = Math.min(100, currentFill + delta);
      }

      // Convert fill percentage back to distance:
      // fill = ((empty - dist) / (empty - full)) * 100
      // dist = empty - (fill / 100) * (empty - full)
      const usable = bin.empty_distance - bin.full_distance;
      const calculatedDistance = bin.empty_distance - (newFill / 100) * usable;
      // Add slight jitter (+/- 0.15 cm) typical of HC-SR04 speed-of-sound / air temperature fluctuations
      const jitter = (Math.random() - 0.5) * 0.3;
      const realisticDistance = Math.round((calculatedDistance + jitter) * 10) / 10;

      this.processSimulatedReading(bin.id, realisticDistance, true, false);
    }
  }

  broadcastSimulationStatus() {
    if (this.io) {
      this.io.emit('simulation:status', this.getStatus());
    }
  }

  getStatus() {
    return {
      is_running: this.isRunning,
      interval_seconds: this.intervalSeconds,
      selected_bin_id: this.selectedBinId,
      active_scenario: this.activeScenario,
      current_state: this.currentSimulationState
    };
  }
}

const simulationEngine = new SimulationEngine();
module.exports = simulationEngine;
