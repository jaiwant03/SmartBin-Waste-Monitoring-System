/**
 * Analytics API Routes
 * Aggregates live and historical metrics from persisted database records
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
  try {
    const bins = db.getBins();
    const readings = db.getAllRecentReadings(100);
    const alerts = db.getAlerts(true);

    // 1. Metric Counts
    const totalBins = bins.length;
    let normalCount = 0;
    let collectionNeededCount = 0;
    let fullCount = 0;
    let offlineCount = 0;
    let sensorErrorCount = 0;

    let fillSum = 0;
    let validOnlineCount = 0;

    const locationMap = {};

    bins.forEach(bin => {
      // Status breakdown
      if (!bin.is_online || bin.status === 'OFFLINE') {
        offlineCount++;
      } else if (!bin.sensor_valid || bin.status === 'SENSOR ERROR') {
        sensorErrorCount++;
      } else if (bin.status === 'FULL') {
        fullCount++;
      } else if (bin.status === 'HIGH') {
        collectionNeededCount++;
      } else {
        normalCount++;
      }

      // Fill average calculation
      if (bin.is_online && bin.sensor_valid && bin.fill_percentage !== null) {
        fillSum += bin.fill_percentage;
        validOnlineCount++;
      }

      // Location grouping
      const loc = bin.location || 'Unknown';
      if (!locationMap[loc]) {
        locationMap[loc] = { totalFill: 0, count: 0 };
      }
      if (bin.fill_percentage !== null) {
        locationMap[loc].totalFill += bin.fill_percentage;
        locationMap[loc].count++;
      }
    });

    const averageFillPercentage = validOnlineCount > 0 ? Math.round((fillSum / validOnlineCount) * 10) / 10 : 0.0;

    // 2. Status distribution for pie/donut charts
    const statusDistribution = [
      { name: 'Normal (0-79%)', value: normalCount, color: '#16A34A' },
      { name: 'Collection Needed (80-94%)', value: collectionNeededCount, color: '#D97706' },
      { name: 'Critical / Full (95-100%)', value: fullCount, color: '#DC2626' },
      { name: 'Sensor Error', value: sensorErrorCount, color: '#9333EA' },
      { name: 'Offline Devices', value: offlineCount, color: '#64748B' }
    ].filter(item => item.value > 0);

    // 3. Fill percentage by bin for bar chart
    const binFillComparison = bins.map(bin => ({
      id: bin.id,
      name: bin.name,
      location: bin.location,
      fill_percentage: bin.fill_percentage ?? 0,
      status: bin.status,
      is_online: bin.is_online
    }));

    // 4. Collection priority ranking (sorted by priority ascending: 1 = most urgent)
    const priorityRanking = [...bins].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (b.fill_percentage || 0) - (a.fill_percentage || 0);
    });

    // 5. Fill level history trend over time (from latest readings)
    // Group readings by timestamp intervals or take latest 30 readings
    const trendReadings = readings
      .filter(r => r.sensor_valid && r.fill_percentage !== null)
      .slice(-30)
      .map(r => ({
        timestamp: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        bin_id: r.bin_id,
        fill_percentage: r.fill_percentage
      }));

    // 6. Location breakdown
    const locationBreakdown = Object.keys(locationMap).map(loc => ({
      location: loc,
      average_fill: locationMap[loc].count > 0 ? Math.round((locationMap[loc].totalFill / locationMap[loc].count) * 10) / 10 : 0,
      bin_count: locationMap[loc].count
    }));

    // 7. Alert stats
    const activeAlertsCount = alerts.filter(a => !a.is_resolved).length;
    const resolvedAlertsCount = alerts.filter(a => a.is_resolved).length;

    return res.json({
      success: true,
      data: {
        summary: {
          total_bins: totalBins,
          normal_bins: normalCount,
          collection_needed_bins: collectionNeededCount,
          full_bins: fullCount,
          offline_bins: offlineCount,
          sensor_error_bins: sensorErrorCount,
          average_fill_percentage: averageFillPercentage,
          active_alerts_count: activeAlertsCount,
          resolved_alerts_count: resolvedAlertsCount
        },
        status_distribution: statusDistribution,
        bin_fill_comparison: binFillComparison,
        priority_ranking: priorityRanking,
        trend_readings: trendReadings,
        location_breakdown: locationBreakdown
      }
    });
  } catch (err) {
    console.error('Error generating analytics:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
