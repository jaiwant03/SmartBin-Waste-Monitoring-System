/**
 * SmartBin Municipal Waste Management System - Backend Server
 * Express REST API + Socket.IO Real-Time Engine
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./database/db');
const alertService = require('./services/alertService');
const staleDeviceMonitor = require('./services/staleDeviceMonitor');
const simulationEngine = require('./services/simulationEngine');

const app = express();
const server = http.createServer(app);

// CORS configuration for local development and LAN access
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach Socket.IO to alert and monitoring services
alertService.setSocketIO(io);
staleDeviceMonitor.start(io);
simulationEngine.init(io);

// API Routes
app.use('/api/bins', require('./routes/bins')(io));
app.use('/api/alerts', require('./routes/alerts')(io));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/simulation', require('./routes/simulation'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/health', require('./routes/health')(io));

// Root info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'SmartBin Municipal Waste Monitoring API',
    status: 'ACTIVE',
    version: '1.0.0',
    documentation: '/api/health',
    endpoints: [
      'POST /api/bins/data',
      'GET /api/bins',
      'GET /api/bins/:id',
      'GET /api/alerts',
      'PATCH /api/alerts/:id/resolve',
      'GET /api/analytics',
      'GET /api/settings',
      'POST /api/simulation/control',
      'GET /api/health'
    ]
  });
});

// Socket.IO Connection Handler
io.on('connection', socket => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Send initial connection greeting and simulator state
  socket.emit('system:connection', {
    status: 'CONNECTED',
    clientId: socket.id,
    timestamp: new Date().toISOString()
  });
  socket.emit('simulation:status', simulationEngine.getStatus());

  socket.on('disconnect', reason => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
  });
});

const PORT = process.env.PORT || 5000;

function startServer(port = PORT) {
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log('========================================================');
      console.log(` SmartBin Municipal Backend is running on port ${port}`);
      console.log(` REST API: http://localhost:${port}`);
      console.log(` Health:   http://localhost:${port}/api/health`);
      console.log(' Real-time: Socket.IO initialized');
      console.log('========================================================');
      resolve(server);
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    staleDeviceMonitor.stop();
    simulationEngine.pause();
    server.close(() => {
      resolve();
    });
  });
}

if (require.main === module) {
  startServer(PORT);
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\nShutting down SmartBin server gracefully...');
  stopServer().then(() => {
    db.saveSync();
    process.exit(0);
  });
});

module.exports = { app, server, startServer, stopServer };
