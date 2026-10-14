import React, { useState, useEffect } from 'react';
import VisualBin from '../components/VisualBin';
import StatusBadge from '../components/StatusBadge';
import {
  Cpu,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Radio,
  Wifi,
  WifiOff,
  AlertTriangle,
  Zap,
  Clock,
  Gauge,
  Percent,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import * as api from '../services/api';

export default function SimulationPage({
  bins = [],
  simulation = {},
  onSimulationControl
}) {
  const [selectedBinId, setSelectedBinId] = useState(simulation.selected_bin_id || 'BIN-001');
  const [manualDistance, setManualDistance] = useState(22.5);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [simBackendOffline, setSimBackendOffline] = useState(false);

  const targetBin = bins.find(b => b.id === selectedBinId) || bins[0] || {
    id: 'BIN-001',
    empty_distance: 40.0,
    full_distance: 5.0,
    fill_percentage: 50.0,
    distance_cm: 22.5,
    status: 'MEDIUM',
    sensor_valid: true,
    is_online: true
  };

  useEffect(() => {
    if (targetBin && targetBin.distance_cm > 0) {
      setManualDistance(targetBin.distance_cm);
    }
  }, [targetBin?.id]);

  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    setManualDistance(val);
    triggerTelemetryUpdate(val, true);
  };

  const triggerTelemetryUpdate = async (dist, valid = true) => {
    setIsTransmitting(true);
    try {
      await api.controlSimulation({
        action: 'set_distance',
        bin_id: selectedBinId,
        distance: dist
      });
    } catch (err) {
      console.error('Simulation update error:', err);
    } finally {
      setTimeout(() => setIsTransmitting(false), 300);
    }
  };

  const handleApplyScenario = async (scenarioName) => {
    try {
      await api.controlSimulation({
        action: 'scenario',
        scenario: scenarioName,
        bin_id: selectedBinId
      });
      // Synchronize manual slider representation
      if (scenarioName === 'empty') setManualDistance(40.0);
      else if (scenarioName === 'half') setManualDistance(22.5);
      else if (scenarioName === 'nearly_full') setManualDistance(8.5);
      else if (scenarioName === 'completely_full') setManualDistance(5.0);
    } catch (err) {
      console.error('Failed to apply scenario:', err);
    }
  };

  const handleSimulateError = async () => {
    try {
      await api.controlSimulation({
        action: 'simulate_error',
        bin_id: selectedBinId
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateOffline = async () => {
    try {
      await api.controlSimulation({
        action: 'simulate_offline',
        bin_id: selectedBinId
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateBackendDisconnect = () => {
    setSimBackendOffline(!simBackendOffline);
  };

  const echoDurationUs = targetBin.sensor_valid && targetBin.distance_cm > 0
    ? Math.round(targetBin.distance_cm * 58.31)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Simulation Stage Container */}
      <div className="simulator-container">
        {/* Left Column: Visual Garbage Bin & HC-SR04 Sensor Graphic */}
        <div className="bin-stage-card">
          {/* Simulation Mode Watermark Banner */}
          <div className="sim-banner">
            <Radio size={14} />
            <span>SIMULATION MODE — VIRTUAL SENSOR DATA</span>
          </div>

          <VisualBin
            fillPercentage={targetBin.fill_percentage}
            distanceCm={targetBin.distance_cm}
            status={targetBin.status}
            sensorValid={targetBin.sensor_valid}
            isOnline={targetBin.is_online && !simBackendOffline}
            emptyDistance={targetBin.empty_distance || 40.0}
            fullDistance={targetBin.full_distance || 5.0}
            isSimulating={simulation.is_running}
          />

          {/* Measured Distance Callout */}
          <div className="distance-callout">
            <div className="callout-item">
              <span className="callout-title">Measured Distance</span>
              <span className="callout-val">
                {targetBin.status === 'SENSOR ERROR' || targetBin.distance_cm < 0
                  ? 'Sensor Fault'
                  : `${targetBin.distance_cm} cm`}
              </span>
            </div>

            <div className="callout-item" style={{ alignItems: 'flex-end' }}>
              <span className="callout-title">Fill Volume</span>
              <span className="callout-val" style={{ color: targetBin.status === 'FULL' ? '#DC2626' : targetBin.status === 'HIGH' ? '#D97706' : '#16A34A' }}>
                {targetBin.status === 'SENSOR ERROR' ? '--' : `${targetBin.fill_percentage ?? 0}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Simulation Control Center */}
        <div className="simulator-controls">
          {/* Bin Selector & Run State */}
          <div className="control-section">
            <div className="section-heading">
              <Cpu size={18} color="#087E8B" />
              <span>Ultrasonic Node Controller</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Target Node:</label>
                <select
                  className="form-select"
                  value={selectedBinId}
                  onChange={e => setSelectedBinId(e.target.value)}
                  style={{ fontWeight: 700 }}
                  id="select-sim-bin"
                >
                  {bins.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.id} — {b.location}
                    </option>
                  ))}
                </select>
              </div>

              {/* Loop Controls */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {simulation.is_running ? (
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={() => onSimulationControl && onSimulationControl({ action: 'pause' })}
                    title="Pause Automatic Reading Loop"
                    id="btn-pause-sim"
                  >
                    <Pause size={14} />
                    <span>Pause Sim</span>
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onSimulationControl && onSimulationControl({ action: 'resume' })}
                    title="Resume Autonomous Telemetry"
                    id="btn-resume-sim"
                  >
                    <Play size={14} />
                    <span>Resume Sim</span>
                  </button>
                )}

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onSimulationControl && onSimulationControl({ action: 'reset' })}
                  title="Reset Bins to Default Demo State"
                  id="btn-reset-sim"
                >
                  <RotateCcw size={14} />
                  <span>Reset All</span>
                </button>
              </div>
            </div>
          </div>

          {/* Manual Distance Slider */}
          <div className="control-section">
            <div className="section-heading">
              <Sliders size={18} color="#16A34A" />
              <span>Manual Ultrasonic Distance Tuning</span>
            </div>

            <div className="distance-slider-group">
              <div className="slider-labels">
                <span>Full (5.0 cm)</span>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                  Selected Distance: {manualDistance} cm
                </span>
                <span>Empty (40.0 cm)</span>
              </div>

              {/* Inverted slider: 5cm is Full (100%), 40cm is Empty (0%) */}
              <input
                type="range"
                className="range-slider"
                min="5.0"
                max="40.0"
                step="0.5"
                value={manualDistance}
                onChange={handleSliderChange}
                id="slider-ultrasonic-distance"
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                <span>100% Full Capacity</span>
                <span>50% Half Capacity</span>
                <span>0% Empty Bin</span>
              </div>
            </div>
          </div>

          {/* Test Scenarios A through D */}
          <div className="control-section">
            <div className="section-heading">
              <CheckCircle2 size={18} color="#D97706" />
              <span>Standard Verification Scenarios (A – D)</span>
            </div>

            <div className="scenario-buttons-grid">
              <button
                className={`btn-scenario ${targetBin.fill_percentage === 0 ? 'active' : ''}`}
                onClick={() => handleApplyScenario('empty')}
                id="btn-scenario-empty"
              >
                <span className="scenario-name">Scenario A</span>
                <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>Empty Bin</span>
                <span className="scenario-param">40 cm • 0% Fill</span>
              </button>

              <button
                className={`btn-scenario ${targetBin.fill_percentage === 50 ? 'active' : ''}`}
                onClick={() => handleApplyScenario('half')}
                id="btn-scenario-half"
              >
                <span className="scenario-name">Scenario B</span>
                <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>Half-Filled</span>
                <span className="scenario-param">22.5 cm • 50% Fill</span>
              </button>

              <button
                className={`btn-scenario ${targetBin.fill_percentage === 90 ? 'active' : ''}`}
                onClick={() => handleApplyScenario('nearly_full')}
                id="btn-scenario-nearly-full"
              >
                <span className="scenario-name">Scenario C</span>
                <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>Nearly Full</span>
                <span className="scenario-param">8.5 cm • 90% (High)</span>
              </button>

              <button
                className={`btn-scenario ${targetBin.fill_percentage === 100 ? 'active' : ''}`}
                onClick={() => handleApplyScenario('completely_full')}
                id="btn-scenario-completely-full"
              >
                <span className="scenario-name">Scenario D</span>
                <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>Completely Full</span>
                <span className="scenario-param">5.0 cm • 100% (Urgent)</span>
              </button>
            </div>
          </div>

          {/* Failure Injection Scenarios E, F, G */}
          <div className="control-section">
            <div className="section-heading">
              <AlertTriangle size={18} color="#DC2626" />
              <span>Hardware & Network Fault Injections</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleSimulateError}
                style={{ justifyContent: 'flex-start', padding: '10px' }}
                title="Scenario E: Simulate pulse timeout / sensor fault"
                id="btn-fault-sensor"
              >
                <AlertTriangle size={15} color="#9333EA" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>Scenario E: Sensor Fault</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Invalid / Timeout Echo (-1 cm)</div>
                </div>
              </button>

              <button
                className="btn btn-secondary btn-sm"
                onClick={handleSimulateOffline}
                style={{ justifyContent: 'flex-start', padding: '10px' }}
                title="Scenario F: Drop ESP8266 Wi-Fi connection"
                id="btn-fault-wifi"
              >
                <WifiOff size={15} color="#DC2626" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>Scenario F: Wi-Fi Drop</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ESP8266 stops transmitting</div>
                </div>
              </button>

              <button
                className={`btn btn-sm ${simBackendOffline ? 'btn-danger' : 'btn-secondary'}`}
                onClick={handleSimulateBackendDisconnect}
                style={{ justifyContent: 'flex-start', padding: '10px' }}
                title="Scenario G: Simulate backend offline state"
                id="btn-fault-backend"
              >
                <Radio size={15} color={simBackendOffline ? '#FFFFFF' : '#D97706'} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>Scenario G: Backend Drop</div>
                  <div style={{ fontSize: '0.7rem', color: simBackendOffline ? '#FFFFFF' : 'var(--text-secondary)' }}>
                    {simBackendOffline ? 'Backend Disconnected' : 'Toggle Disconnection'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Live Telemetry Readout Grid */}
          <div className="control-section">
            <div className="section-heading">
              <Zap size={18} color="#087E8B" />
              <span>Real-Time HC-SR04 Hardware Telemetry Feed</span>
            </div>

            <div className="telemetry-grid">
              <div className="telemetry-box">
                <span className="telemetry-label">Trigger Pulse</span>
                <span className="telemetry-value">10.0 µs HIGH</span>
              </div>

              <div className="telemetry-box">
                <span className="telemetry-label">Echo Pulse Width</span>
                <span className="telemetry-value">
                  {targetBin.status === 'SENSOR ERROR' ? 'TIMEOUT' : `${echoDurationUs} µs`}
                </span>
              </div>

              <div className="telemetry-box">
                <span className="telemetry-label">Acoustic Distance</span>
                <span className="telemetry-value">
                  {targetBin.status === 'SENSOR ERROR' ? 'Fault' : `${targetBin.distance_cm} cm`}
                </span>
              </div>

              <div className="telemetry-box">
                <span className="telemetry-label">Fill Percentage</span>
                <span className="telemetry-value">
                  {targetBin.fill_percentage !== null ? `${targetBin.fill_percentage}%` : 'Invalid'}
                </span>
              </div>

              <div className="telemetry-box">
                <span className="telemetry-label">Evaluated Status</span>
                <span className="telemetry-value">
                  <StatusBadge status={targetBin.status} />
                </span>
              </div>

              <div className="telemetry-box">
                <span className="telemetry-label">Node Wi-Fi State</span>
                <span className="telemetry-value" style={{ color: targetBin.is_online ? '#16A34A' : '#DC2626' }}>
                  {targetBin.is_online ? 'CONNECTED' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
