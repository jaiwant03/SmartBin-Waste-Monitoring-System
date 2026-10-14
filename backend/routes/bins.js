/**
 * Bins API Routes
 * Endpoints for receiving IoT sensor readings and managing bin entities
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { calculateFillPercentage, classifyStatus, getRecommendedAction, getPriorityRank } = require('../services/calculationService');
const alertService = require('../services/alertService');

module.exports = function (io) {
  /**
   * POST /api/bins/data
   * Ingests sensor reading from ESP8266 or Software Simulator
   */
  router.post('/data', (req, res) => {
    try {
      const { bin_id, distance_cm, sensor_valid, source } = req.body;

      if (!bin_id || typeof bin_id !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid bin_id parameter.'
        });
      }

      const cleanBinId = bin_id.trim().toUpperCase();
      let bin = db.getBinById(cleanBinId);

      // Auto-register if new hardware node joins
      if (!bin) {
        bin = db.createBin({
          id: cleanBinId,
          name: `ESP8266 Node (${cleanBinId})`,
          location: 'Auto-Registered Node'
        });
      }

      let parsedDistance = Number(distance_cm);
      let isValidSensor = sensor_valid !== false && !isNaN(parsedDistance) && parsedDistance > 0;
      let calculatedFill = null;
      let status = 'SENSOR ERROR';

      if (isValidSensor) {
        calculatedFill = calculateFillPercentage(parsedDistance, bin.empty_distance, bin.full_distance);
        if (calculatedFill !== null) {
          status = classifyStatus(calculatedFill, true, true, {
            collection: bin.collection_threshold,
            urgent: bin.urgent_threshold
          });
        } else {
          isValidSensor = false;
          status = 'SENSOR ERROR';
        }
      } else {
        isValidSensor = false;
        status = 'SENSOR ERROR';
      }

      const action = getRecommendedAction(status, calculatedFill || 0);
      const priority = getPriorityRank(status);

      // Update bin state
      const updatedBin = db.updateBin(cleanBinId, {
        distance_cm: isValidSensor ? parsedDistance : -1,
        fill_percentage: calculatedFill,
        status,
        sensor_valid: isValidSensor,
        is_online: true,
        priority,
        action,
        last_reading_time: new Date().toISOString()
      });

      // Save reading log
      const reading = db.addReading({
        bin_id: cleanBinId,
        distance_cm: isValidSensor ? parsedDistance : -1,
        fill_percentage: calculatedFill,
        status,
        sensor_valid: isValidSensor,
        source: source || 'hardware',
        timestamp: new Date().toISOString()
      });

      // Trigger alert evaluation
      alertService.processBinAlerts(updatedBin);

      // Broadcast real-time updates to all connected dashboard clients
      if (io) {
        io.emit('bin:update', updatedBin);
        io.emit('reading:new', reading);
      }

      return res.status(200).json({
        success: true,
        message: 'Reading processed successfully.',
        data: {
          bin: updatedBin,
          reading
        }
      });
    } catch (err) {
      console.error('Error in POST /api/bins/data:', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while processing sensor reading.'
      });
    }
  });

  /**
   * GET /api/bins
   * Return all registered bins with their latest status
   */
  router.get('/', (req, res) => {
    try {
      const bins = db.getBins();
      return res.json({
        success: true,
        count: bins.length,
        data: bins
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/bins/:id
   * Return specific bin metadata, history, and active alerts
   */
  router.get('/:id', (req, res) => {
    try {
      const bin = db.getBinById(req.params.id);
      if (!bin) {
        return res.status(404).json({ success: false, error: 'Bin not found.' });
      }

      const readings = db.getReadingsByBin(bin.id, 50);
      const alerts = db.getAlerts(true).filter(a => a.bin_id.toUpperCase() === bin.id.toUpperCase());

      return res.json({
        success: true,
        data: {
          ...bin,
          readings,
          alerts
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/bins
   * Register a new bin
   */
  router.post('/', (req, res) => {
    try {
      const { id, name, location, empty_distance, full_distance, collection_threshold, urgent_threshold } = req.body;

      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Bin ID is required.' });
      }

      if (empty_distance && full_distance && Number(empty_distance) <= Number(full_distance)) {
        return res.status(400).json({
          success: false,
          error: 'Empty distance must be greater than full distance.'
        });
      }

      const newBin = db.createBin({
        id,
        name,
        location,
        empty_distance,
        full_distance,
        collection_threshold,
        urgent_threshold
      });

      if (io) {
        io.emit('bin:created', newBin);
      }

      return res.status(201).json({
        success: true,
        message: 'Bin registered successfully.',
        data: newBin
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  });

  /**
   * PUT /api/bins/:id
   * Update an existing bin's metadata or configuration
   */
  router.put('/:id', (req, res) => {
    try {
      const bin = db.getBinById(req.params.id);
      if (!bin) {
        return res.status(404).json({ success: false, error: 'Bin not found.' });
      }

      const { name, location, empty_distance, full_distance, collection_threshold, urgent_threshold } = req.body;

      if (empty_distance && full_distance && Number(empty_distance) <= Number(full_distance)) {
        return res.status(400).json({
          success: false,
          error: 'Empty distance must be greater than full distance.'
        });
      }

      const updated = db.updateBin(bin.id, {
        name,
        location,
        empty_distance: Number(empty_distance) || bin.empty_distance,
        full_distance: Number(full_distance) || bin.full_distance,
        collection_threshold: Number(collection_threshold) || bin.collection_threshold,
        urgent_threshold: Number(urgent_threshold) || bin.urgent_threshold
      });

      if (io) {
        io.emit('bin:update', updated);
      }

      return res.json({
        success: true,
        message: 'Bin updated successfully.',
        data: updated
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  });

  /**
   * DELETE /api/bins/:id
   * Remove a bin with confirmation
   */
  router.delete('/:id', (req, res) => {
    try {
      const bin = db.getBinById(req.params.id);
      if (!bin) {
        return res.status(404).json({ success: false, error: 'Bin not found.' });
      }

      const deleted = db.deleteBin(bin.id);
      if (deleted && io) {
        io.emit('bin:deleted', { bin_id: bin.id });
      }

      return res.json({
        success: true,
        message: `Bin ${bin.id} removed successfully.`
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
