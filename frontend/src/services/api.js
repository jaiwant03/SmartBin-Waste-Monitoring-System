import axios from 'axios';

// Automatically detect host (works in dev proxy and directly)
const API_BASE_URL = window.location.port === '3000' 
  ? 'http://localhost:5000/api'
  : '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 8000
});

// Bins API
export const getBins = () => apiClient.get('/bins');
export const getBinById = (id) => apiClient.get(`/bins/${id}`);
export const createBin = (data) => apiClient.post('/bins', data);
export const updateBin = (id, data) => apiClient.put(`/bins/${id}`, data);
export const deleteBin = (id) => apiClient.delete(`/bins/${id}`);
export const postSensorData = (data) => apiClient.post('/bins/data', data);

// Alerts API
export const getAlerts = (includeResolved = true) => apiClient.get('/alerts', { params: { includeResolved } });
export const resolveAlert = (id) => apiClient.patch(`/alerts/${id}/resolve`);

// Analytics API
export const getAnalytics = () => apiClient.get('/analytics');

// Settings API
export const getSettings = () => apiClient.get('/settings');
export const updateSettings = (data) => apiClient.put('/settings', data);

// Simulation API
export const getSimulationStatus = () => apiClient.get('/simulation/status');
export const controlSimulation = (payload) => apiClient.post('/simulation/control', payload);

// System Health API
export const getHealth = () => apiClient.get('/health');

export default apiClient;
