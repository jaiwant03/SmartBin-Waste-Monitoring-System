import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, AlertCircle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import * as api from '../services/api';

export default function SettingsPage({ settings, onRefresh }) {
  const [formData, setFormData] = useState({
    empty_distance: 40.0,
    full_distance: 5.0,
    collection_threshold: 80,
    urgent_threshold: 95,
    simulation_interval_sec: 4,
    offline_timeout_sec: 60,
    auto_simulation: true
  });

  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        empty_distance: settings.empty_distance ?? 40.0,
        full_distance: settings.full_distance ?? 5.0,
        collection_threshold: settings.collection_threshold ?? 80,
        urgent_threshold: settings.urgent_threshold ?? 95,
        simulation_interval_sec: settings.simulation_interval_sec ?? 4,
        offline_timeout_sec: settings.offline_timeout_sec ?? 60,
        auto_simulation: settings.auto_simulation ?? true
      });
    }
  }, [settings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });

    if (Number(formData.empty_distance) <= Number(formData.full_distance)) {
      setStatusMessage({
        type: 'error',
        text: 'Empty reference distance must be greater than Full reference distance.'
      });
      return;
    }

    try {
      setIsSaving(true);
      await api.updateSettings(formData);
      setStatusMessage({
        type: 'success',
        text: 'Settings updated successfully! Changes applied immediately across backend & simulator.'
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || err.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '880px' }}>
      {/* Top Banner */}
      <div className="content-card" style={{ padding: '20px 24px' }}>
        <h2 className="card-title">
          <Settings size={20} color="#087E8B" />
          Global Municipal & Hardware System Settings
        </h2>
        <p className="card-subtitle">
          Configure sensor dimension baselines, dispatch thresholds, simulator speed, and network stale timeouts.
        </p>
      </div>

      {statusMessage.text && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            backgroundColor: statusMessage.type === 'error' ? '#FEE2E2' : '#DCFCE7',
            color: statusMessage.type === 'error' ? '#B91C1C' : '#15803D',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.86rem',
            fontWeight: 600
          }}
        >
          {statusMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave}>
        <div className="content-card" style={{ gap: '22px' }}>
          {/* Section 1: Ultrasonic Calibration */}
          <div>
            <h3 style={{ fontSize: '0.96rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '14px' }}>
              1. Ultrasonic Sensor Reference Calibration
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Default Empty Bin Distance (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  value={formData.empty_distance}
                  onChange={e => setFormData({ ...formData, empty_distance: parseFloat(e.target.value) })}
                  required
                />
                <span className="form-help">Ultrasonic distance to base when bin has 0% garbage</span>
              </div>

              <div className="form-group">
                <label className="form-label">Default Full Bin Distance (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  value={formData.full_distance}
                  onChange={e => setFormData({ ...formData, full_distance: parseFloat(e.target.value) })}
                  required
                />
                <span className="form-help">Sensor clearance when garbage reaches 100% full capacity</span>
              </div>
            </div>
          </div>

          {/* Section 2: Collection Thresholds */}
          <div>
            <h3 style={{ fontSize: '0.96rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '14px' }}>
              2. Municipal Dispatch Trigger Thresholds
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Collection Needed Threshold (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.collection_threshold}
                  onChange={e => setFormData({ ...formData, collection_threshold: parseInt(e.target.value, 10) })}
                  required
                />
                <span className="form-help">Default 80%: Schedules bin for standard collection shift</span>
              </div>

              <div className="form-group">
                <label className="form-label">Urgent Collection Threshold (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.urgent_threshold}
                  onChange={e => setFormData({ ...formData, urgent_threshold: parseInt(e.target.value, 10) })}
                  required
                />
                <span className="form-help">Default 95%: Dispatches emergency overflow vehicle</span>
              </div>
            </div>
          </div>

          {/* Section 3: Telemetry & Timings */}
          <div>
            <h3 style={{ fontSize: '0.96rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '14px' }}>
              3. Telemetry Intervals & Offline Detection
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Simulator Telemetry Interval (Seconds)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  className="form-input"
                  value={formData.simulation_interval_sec}
                  onChange={e => setFormData({ ...formData, simulation_interval_sec: parseInt(e.target.value, 10) })}
                  required
                />
                <span className="form-help">Frequency of software simulated readings</span>
              </div>

              <div className="form-group">
                <label className="form-label">Node Stale / Offline Timeout (Seconds)</label>
                <input
                  type="number"
                  min="10"
                  max="600"
                  className="form-input"
                  value={formData.offline_timeout_sec}
                  onChange={e => setFormData({ ...formData, offline_timeout_sec: parseInt(e.target.value, 10) })}
                  required
                />
                <span className="form-help">Time after last ping before a node is marked OFFLINE</span>
              </div>
            </div>
          </div>

          {/* Hardware Compatibility Notice */}
          <div style={{ padding: '14px 18px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
            <Info size={22} color="#087E8B" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Hardware Synchronization Notice:</strong>
              <p>
                Changing settings here applies immediately to the <strong>Express backend server</strong>, REST API calculations, and the <strong>software sensor simulator</strong>.
              </p>
              <p style={{ marginTop: '4px' }}>
                For physical <strong>ESP8266 microcontrollers</strong>, if you alter physical reference distances or Wi-Fi configurations, update <code>firmware/config.h</code> and re-flash the board via Arduino IDE.
              </p>
            </div>
          </div>

          {/* Submit Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button type="submit" className="btn btn-primary" disabled={isSaving} id="btn-save-settings">
              <Save size={16} />
              <span>{isSaving ? 'Saving Changes...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
