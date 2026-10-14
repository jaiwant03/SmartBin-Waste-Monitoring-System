import { useState, useEffect, useCallback } from 'react';
import { socket } from '../services/socket';
import * as api from '../services/api';

export function useSmartBin() {
  const [bins, setBins] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [settings, setSettings] = useState(null);
  const [simulation, setSimulation] = useState({
    is_running: false,
    interval_seconds: 4,
    selected_bin_id: 'BIN-001',
    active_scenario: 'custom',
    current_state: null
  });
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [selectedBinId, setSelectedBinId] = useState(null);
  const [selectedBinDetails, setSelectedBinDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial dataset from REST API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [binsRes, alertsRes, analyticsRes, settingsRes, simRes] = await Promise.all([
        api.getBins(),
        api.getAlerts(true),
        api.getAnalytics(),
        api.getSettings(),
        api.getSimulationStatus()
      ]);

      setBins(binsRes.data?.data || []);
      setAlerts(alertsRes.data?.data || []);
      setAnalytics(analyticsRes.data?.data || null);
      setSettings(settingsRes.data?.data || null);
      setSimulation(simRes.data?.data || {});
      setError(null);
    } catch (err) {
      console.error('Failed to fetch SmartBin data:', err);
      setError('Unable to communicate with SmartBin backend server.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch full details for a selected bin
  const loadBinDetails = useCallback(async (id) => {
    if (!id) {
      setSelectedBinDetails(null);
      return;
    }
    try {
      const res = await api.getBinById(id);
      setSelectedBinDetails(res.data?.data || null);
    } catch (err) {
      console.error(`Failed to load details for bin ${id}:`, err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedBinId) {
      loadBinDetails(selectedBinId);
    }
  }, [selectedBinId, loadBinDetails]);

  // Real-time Socket.IO Event Handlers
  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      setError(null);
      fetchData(); // Sync up on reconnection
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onBinUpdate(updatedBin) {
      setBins(prev => {
        const index = prev.findIndex(b => b.id.toUpperCase() === updatedBin.id.toUpperCase());
        if (index === -1) {
          return [...prev, updatedBin];
        }
        const next = [...prev];
        next[index] = updatedBin;
        return next;
      });

      // If this bin is currently open in detail modal, refresh its details
      setSelectedBinDetails(prev => {
        if (prev && prev.id.toUpperCase() === updatedBin.id.toUpperCase()) {
          return {
            ...prev,
            ...updatedBin,
            readings: prev.readings ? [...prev.readings, {
              timestamp: new Date().toISOString(),
              distance_cm: updatedBin.distance_cm,
              fill_percentage: updatedBin.fill_percentage,
              status: updatedBin.status,
              sensor_valid: updatedBin.sensor_valid
            }].slice(-50) : []
          };
        }
        return prev;
      });

      // Refresh analytics in background
      api.getAnalytics().then(res => setAnalytics(res.data?.data || null)).catch(() => {});
    }

    function onBinStatusChange({ updated }) {
      if (updated) onBinUpdate(updated);
    }

    function onBinCreated(newBin) {
      setBins(prev => [...prev, newBin]);
    }

    function onBinDeleted({ bin_id }) {
      setBins(prev => prev.filter(b => b.id.toUpperCase() !== bin_id.toUpperCase()));
      if (selectedBinId?.toUpperCase() === bin_id.toUpperCase()) {
        setSelectedBinId(null);
        setSelectedBinDetails(null);
      }
    }

    function onNewAlert(alert) {
      setAlerts(prev => [alert, ...prev]);
    }

    function onAlertResolved(alert) {
      setAlerts(prev => prev.map(a => {
        if (alert.id && a.id === alert.id) {
          return { ...a, is_resolved: true, resolved_at: alert.resolved_at || new Date().toISOString() };
        }
        if (alert.bin_id && a.bin_id.toUpperCase() === alert.bin_id.toUpperCase()) {
          if (!alert.type || a.type === alert.type) {
            return { ...a, is_resolved: true, resolved_at: new Date().toISOString() };
          }
        }
        return a;
      }));
    }

    function onSimulationStatus(status) {
      setSimulation(status);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('bin:update', onBinUpdate);
    socket.on('bin:status-change', onBinStatusChange);
    socket.on('bin:created', onBinCreated);
    socket.on('bin:deleted', onBinDeleted);
    socket.on('alert:new', onNewAlert);
    socket.on('alert:resolved', onAlertResolved);
    socket.on('simulation:status', onSimulationStatus);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('bin:update', onBinUpdate);
      socket.off('bin:status-change', onBinStatusChange);
      socket.off('bin:created', onBinCreated);
      socket.off('bin:deleted', onBinDeleted);
      socket.off('alert:new', onNewAlert);
      socket.off('alert:resolved', onAlertResolved);
      socket.off('simulation:status', onSimulationStatus);
    };
  }, [fetchData, selectedBinId]);

  // Actions
  const handleResolveAlert = async (alertId) => {
    try {
      const res = await api.resolveAlert(alertId);
      if (res.data?.success) {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_resolved: true, resolved_at: new Date().toISOString() } : a));
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const handleSimulationControl = async (payload) => {
    try {
      const res = await api.controlSimulation(payload);
      if (res.data?.data) {
        setSimulation(res.data.data);
      }
    } catch (err) {
      console.error('Failed to control simulation:', err);
    }
  };

  const unreadAlertsCount = alerts.filter(a => !a.is_resolved).length;

  return {
    bins,
    alerts,
    analytics,
    settings,
    simulation,
    isConnected,
    loading,
    error,
    selectedBinId,
    selectedBinDetails,
    unreadAlertsCount,
    setSelectedBinId,
    loadBinDetails,
    refreshData: fetchData,
    handleResolveAlert,
    handleSimulationControl
  };
}
