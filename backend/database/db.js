/**
 * Lightweight Persistent JSON Database for SmartBin
 * Provides transactional access, atomic disk persistence, and initial seeding.
 */

const fs = require('fs');
const path = require('path');
const { calculateFillPercentage, classifyStatus, getRecommendedAction, getPriorityRank } = require('../services/calculationService');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'smartbin.json');

const INITIAL_SETTINGS = {
  empty_distance: 40.0,
  full_distance: 5.0,
  collection_threshold: 80,
  urgent_threshold: 95,
  simulation_interval_sec: 4,
  offline_timeout_sec: 60,
  auto_simulation: true
};

const INITIAL_BINS = [
  {
    id: 'BIN-001',
    name: 'North Campus Hub',
    location: 'Main Campus Gate',
    empty_distance: 40.0,
    full_distance: 5.0,
    collection_threshold: 80,
    urgent_threshold: 95,
    distance_cm: 31.2,
    fill_percentage: 25.1,
    status: 'LOW',
    sensor_valid: true,
    is_online: true,
    priority: 6,
    action: getRecommendedAction('LOW', 25.1),
    last_reading_time: new Date(Date.now() - 15000).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 15000).toISOString()
  },
  {
    id: 'BIN-002',
    name: 'Academic Sector Bin',
    location: 'Library Block',
    empty_distance: 40.0,
    full_distance: 5.0,
    collection_threshold: 80,
    urgent_threshold: 95,
    distance_cm: 21.0,
    fill_percentage: 54.3,
    status: 'MEDIUM',
    sensor_valid: true,
    is_online: true,
    priority: 5,
    action: getRecommendedAction('MEDIUM', 54.3),
    last_reading_time: new Date(Date.now() - 22000).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 22000).toISOString()
  },
  {
    id: 'BIN-003',
    name: 'Transit Terminal Bin',
    location: 'Bus Stop',
    empty_distance: 40.0,
    full_distance: 5.0,
    collection_threshold: 80,
    urgent_threshold: 95,
    distance_cm: 9.2,
    fill_percentage: 88.0,
    status: 'HIGH',
    sensor_valid: true,
    is_online: true,
    priority: 2,
    action: getRecommendedAction('HIGH', 88.0),
    last_reading_time: new Date(Date.now() - 10000).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 10000).toISOString()
  },
  {
    id: 'BIN-004',
    name: 'Commercial Zone Bin',
    location: 'Central Market',
    empty_distance: 40.0,
    full_distance: 5.0,
    collection_threshold: 80,
    urgent_threshold: 95,
    distance_cm: 6.1,
    fill_percentage: 96.9,
    status: 'FULL',
    sensor_valid: true,
    is_online: true,
    priority: 1,
    action: getRecommendedAction('FULL', 96.9),
    last_reading_time: new Date(Date.now() - 5000).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 5000).toISOString()
  },
  {
    id: 'BIN-005',
    name: 'Recreational Green Bin',
    location: 'Public Park',
    empty_distance: 40.0,
    full_distance: 5.0,
    collection_threshold: 80,
    urgent_threshold: 95,
    distance_cm: 34.8,
    fill_percentage: 14.9,
    status: 'LOW',
    sensor_valid: true,
    is_online: true,
    priority: 6,
    action: getRecommendedAction('LOW', 14.9),
    last_reading_time: new Date(Date.now() - 35000).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 35000).toISOString()
  },
  {
    id: 'BIN-006',
    name: 'Civic Center Bin',
    location: 'Municipal Office',
    empty_distance: 40.0,
    full_distance: 5.0,
    collection_threshold: 80,
    urgent_threshold: 95,
    distance_cm: -1.0,
    fill_percentage: null,
    status: 'SENSOR ERROR',
    sensor_valid: false,
    is_online: true,
    priority: 3,
    action: getRecommendedAction('SENSOR ERROR', 0),
    last_reading_time: new Date(Date.now() - 18000).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 18000).toISOString()
  }
];

class Database {
  constructor() {
    this.data = {
      bins: [],
      readings: [],
      alerts: [],
      settings: { ...INITIAL_SETTINGS }
    };
    this.saveTimeout = null;
    this.init();
  }

  init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_PATH)) {
      try {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        this.data = {
          bins: parsed.bins && parsed.bins.length > 0 ? parsed.bins : INITIAL_BINS,
          readings: parsed.readings || [],
          alerts: parsed.alerts || [],
          settings: { ...INITIAL_SETTINGS, ...(parsed.settings || {}) }
        };
      } catch (err) {
        console.error('Error reading database file, resetting to initial state:', err.message);
        this.data.bins = INITIAL_BINS;
        this.saveSync();
      }
    } else {
      this.data.bins = INITIAL_BINS;
      // Seed some initial readings for realistic charts
      this.seedInitialReadings();
      this.seedInitialAlerts();
      this.saveSync();
    }
  }

  seedInitialReadings() {
    const now = Date.now();
    const intervals = [10, 8, 6, 4, 2, 0]; // minutes ago
    this.data.bins.forEach(bin => {
      if (bin.sensor_valid && bin.fill_percentage !== null) {
        intervals.forEach(mins => {
          const timestamp = new Date(now - mins * 60000).toISOString();
          // slight variation
          const variation = (Math.random() - 0.5) * 3;
          const fill = Math.min(100, Math.max(0, Math.round((bin.fill_percentage + variation) * 10) / 10));
          this.data.readings.push({
            id: 'READ-' + Math.random().toString(36).substr(2, 9),
            bin_id: bin.id,
            distance_cm: bin.distance_cm,
            fill_percentage: fill,
            status: classifyStatus(fill, true, true),
            sensor_valid: true,
            source: 'simulation',
            timestamp
          });
        });
      }
    });
  }

  seedInitialAlerts() {
    // Initial alerts for BIN-004 (FULL) and BIN-006 (SENSOR ERROR)
    this.data.alerts.push(
      {
        id: 'ALT-INIT-001',
        bin_id: 'BIN-004',
        type: 'URGENT_FULL',
        severity: 'critical',
        message: 'Critical Capacity Warning: Central Market (BIN-004) is 96.9% full.',
        location: 'Central Market',
        fill_percentage: 96.9,
        is_resolved: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        resolved_at: null
      },
      {
        id: 'ALT-INIT-002',
        bin_id: 'BIN-006',
        type: 'SENSOR_ERROR',
        severity: 'warning',
        message: 'Hardware Warning: Municipal Office (BIN-006) reported invalid ultrasonic reading.',
        location: 'Municipal Office',
        fill_percentage: null,
        is_resolved: false,
        created_at: new Date(Date.now() - 7200000).toISOString(),
        resolved_at: null
      }
    );
  }

  save() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveSync();
    }, 150);
  }

  saveSync() {
    try {
      const tempPath = `${DB_PATH}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tempPath, DB_PATH);
    } catch (err) {
      console.error('Failed to save database to disk:', err.message);
    }
  }

  // --- Bins API ---
  getBins() {
    return this.data.bins;
  }

  getBinById(id) {
    return this.data.bins.find(b => b.id.toUpperCase() === id.toUpperCase()) || null;
  }

  createBin(binData) {
    const existing = this.getBinById(binData.id);
    if (existing) {
      throw new Error(`Bin with ID '${binData.id}' already exists.`);
    }

    const emptyDist = Number(binData.empty_distance) || this.data.settings.empty_distance;
    const fullDist = Number(binData.full_distance) || this.data.settings.full_distance;

    const newBin = {
      id: binData.id.trim().toUpperCase(),
      name: binData.name || `Bin ${binData.id}`,
      location: binData.location || 'Unassigned Location',
      empty_distance: emptyDist,
      full_distance: fullDist,
      collection_threshold: Number(binData.collection_threshold) || this.data.settings.collection_threshold,
      urgent_threshold: Number(binData.urgent_threshold) || this.data.settings.urgent_threshold,
      distance_cm: emptyDist,
      fill_percentage: 0.0,
      status: 'LOW',
      sensor_valid: true,
      is_online: true,
      priority: 6,
      action: getRecommendedAction('LOW', 0),
      last_reading_time: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.data.bins.push(newBin);
    this.save();
    return newBin;
  }

  updateBin(id, updates) {
    const index = this.data.bins.findIndex(b => b.id.toUpperCase() === id.toUpperCase());
    if (index === -1) return null;

    const current = this.data.bins[index];
    const updated = {
      ...current,
      ...updates,
      id: current.id, // Immutable ID
      updated_at: new Date().toISOString()
    };

    // If thresholds or distances updated, recompute fill percentage and status if distance is present
    if (updates.empty_distance || updates.full_distance || updates.collection_threshold || updates.urgent_threshold) {
      if (updated.sensor_valid && typeof updated.distance_cm === 'number' && updated.distance_cm > 0) {
        const fill = calculateFillPercentage(updated.distance_cm, updated.empty_distance, updated.full_distance);
        updated.fill_percentage = fill;
        updated.status = classifyStatus(fill, true, updated.is_online, {
          collection: updated.collection_threshold,
          urgent: updated.urgent_threshold
        });
        updated.action = getRecommendedAction(updated.status, fill);
        updated.priority = getPriorityRank(updated.status);
      }
    }

    this.data.bins[index] = updated;
    this.save();
    return updated;
  }

  deleteBin(id) {
    const index = this.data.bins.findIndex(b => b.id.toUpperCase() === id.toUpperCase());
    if (index === -1) return false;

    this.data.bins.splice(index, 1);
    this.save();
    return true;
  }

  // --- Readings API ---
  addReading(reading) {
    const newReading = {
      id: 'READ-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      ...reading,
      timestamp: reading.timestamp || new Date().toISOString()
    };

    this.data.readings.push(newReading);

    // Limit historical readings to prevent excessive memory usage (keep newest 2000)
    if (this.data.readings.length > 2000) {
      this.data.readings = this.data.readings.slice(-1500);
    }

    this.save();
    return newReading;
  }

  getReadingsByBin(binId, limit = 50) {
    return this.data.readings
      .filter(r => r.bin_id.toUpperCase() === binId.toUpperCase())
      .slice(-limit);
  }

  getAllRecentReadings(limit = 100) {
    return this.data.readings.slice(-limit);
  }

  // --- Alerts API ---
  getAlerts(includeResolved = false) {
    if (includeResolved) {
      return this.data.alerts;
    }
    return this.data.alerts.filter(a => !a.is_resolved);
  }

  getAlertById(id) {
    return this.data.alerts.find(a => a.id === id) || null;
  }

  addAlert(alertData) {
    const alert = {
      id: 'ALT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      is_resolved: false,
      created_at: new Date().toISOString(),
      resolved_at: null,
      ...alertData
    };
    this.data.alerts.unshift(alert);

    // Limit historical alerts to 500
    if (this.data.alerts.length > 500) {
      this.data.alerts = this.data.alerts.slice(0, 400);
    }

    this.save();
    return alert;
  }

  resolveAlert(id) {
    const alert = this.data.alerts.find(a => a.id === id);
    if (!alert) return null;

    alert.is_resolved = true;
    alert.resolved_at = new Date().toISOString();
    this.save();
    return alert;
  }

  resolveActiveAlertsForBin(binId, type = null) {
    let resolvedCount = 0;
    this.data.alerts.forEach(a => {
      if (a.bin_id.toUpperCase() === binId.toUpperCase() && !a.is_resolved) {
        if (!type || a.type === type) {
          a.is_resolved = true;
          a.resolved_at = new Date().toISOString();
          resolvedCount++;
        }
      }
    });
    if (resolvedCount > 0) this.save();
    return resolvedCount;
  }

  hasActiveAlert(binId, type) {
    return this.data.alerts.some(
      a => a.bin_id.toUpperCase() === binId.toUpperCase() && a.type === type && !a.is_resolved
    );
  }

  // --- Settings API ---
  getSettings() {
    return this.data.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = {
      ...this.data.settings,
      ...newSettings
    };
    this.save();
    return this.data.settings;
  }

  // Reset demo state if needed
  resetToDefault() {
    this.data.bins = JSON.parse(JSON.stringify(INITIAL_BINS));
    this.data.readings = [];
    this.data.alerts = [];
    this.seedInitialReadings();
    this.seedInitialAlerts();
    this.saveSync();
  }
}

// Singleton database instance
const db = new Database();
module.exports = db;
