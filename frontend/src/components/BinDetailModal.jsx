import React from 'react';
import VisualBin from './VisualBin';
import StatusBadge from './StatusBadge';
import {
  X,
  MapPin,
  Wifi,
  WifiOff,
  AlertTriangle,
  History,
  Sliders,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function BinDetailModal({ bin, onClose, onResolveAlert }) {
  if (!bin) return null;

  const {
    id,
    name,
    location,
    fill_percentage,
    distance_cm,
    status,
    sensor_valid,
    is_online,
    priority,
    action,
    last_reading_time,
    empty_distance = 40.0,
    full_distance = 5.0,
    collection_threshold = 80,
    urgent_threshold = 95,
    readings = [],
    alerts = []
  } = bin;

  // Format historical chart data
  const chartData = readings.map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    fill: r.fill_percentage ?? 0,
    distance: r.distance_cm ?? 0
  }));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '820px' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{id} — {name}</h2>
              <StatusBadge status={status} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '2px' }}>
              <MapPin size={14} />
              <span>{location}</span>
              <span>•</span>
              <span style={{ fontWeight: 600 }}>Priority #{priority}</span>
            </div>
          </div>

          <button className="collapse-btn" onClick={onClose} title="Close Details">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
            {/* Visual Graphic Column */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <VisualBin
                fillPercentage={fill_percentage}
                distanceCm={distance_cm}
                status={status}
                sensorValid={sensor_valid}
                isOnline={is_online}
                emptyDistance={empty_distance}
                fullDistance={full_distance}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Echo Distance:</span>
                  <span style={{ fontWeight: 700 }}>{status === 'SENSOR ERROR' ? 'Fault' : `${distance_cm} cm`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Sensor State:</span>
                  <span style={{ fontWeight: 700, color: sensor_valid ? '#16A34A' : '#DC2626' }}>
                    {sensor_valid ? 'Operational' : 'Hardware Fault'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Wi-Fi Telemetry:</span>
                  <span style={{ fontWeight: 700, color: is_online ? '#16A34A' : '#DC2626' }}>
                    {is_online ? 'Connected' : 'Offline / Stale'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Information Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Action Directive */}
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '10px',
                  backgroundColor: status === 'FULL' ? '#FEE2E2' : status === 'HIGH' ? '#FEF3C7' : '#DCFCE7',
                  border: `1px solid ${status === 'FULL' ? '#FECACA' : status === 'HIGH' ? '#FDE68A' : '#BBF7D0'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.86rem', color: status === 'FULL' ? '#991B1B' : status === 'HIGH' ? '#92400E' : '#166534' }}>
                  <AlertCircle size={16} />
                  <span>Recommended Municipal Action</span>
                </div>
                <p style={{ fontSize: '0.82rem', marginTop: '4px', color: status === 'FULL' ? '#7F1D1D' : status === 'HIGH' ? '#78350F' : '#14532D', lineHeight: 1.4 }}>
                  {action}
                </p>
              </div>

              {/* Chart: Historical Fill Level */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 700, marginBottom: '8px' }}>
                  <History size={16} />
                  <span>Telemetry Fill History</span>
                </div>
                <div style={{ width: '100%', height: '180px', background: '#F8FAFC', borderRadius: '10px', padding: '10px 0', border: '1px solid var(--border-color)' }}>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="fill"
                          name="Fill Level (%)"
                          stroke="#16A34A"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      No telemetry logs recorded yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Hardware Calibration specs */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 700, marginBottom: '8px' }}>
                  <Sliders size={16} />
                  <span>Calibration Dimensions</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '0.78rem' }}>
                  <div style={{ padding: '8px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>Empty Ref</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{empty_distance} cm</div>
                  </div>
                  <div style={{ padding: '8px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>Full Ref</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{full_distance} cm</div>
                  </div>
                  <div style={{ padding: '8px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>Collection %</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{collection_threshold}%</div>
                  </div>
                  <div style={{ padding: '8px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>Urgent %</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{urgent_threshold}%</div>
                  </div>
                </div>
              </div>

              {/* Active Alerts for this bin */}
              {alerts.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 700, marginBottom: '8px' }}>
                    <AlertTriangle size={16} />
                    <span>Active Municipal Alerts ({alerts.filter(a => !a.is_resolved).length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                    {alerts.map(a => (
                      <div
                        key={a.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          backgroundColor: a.is_resolved ? '#F1F5F9' : '#FEE2E2',
                          border: `1px solid ${a.is_resolved ? '#E2E8F0' : '#FECACA'}`
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 700, marginRight: '6px' }}>[{a.type}]</span>
                          <span>{a.message}</span>
                        </div>
                        {!a.is_resolved && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => onResolveAlert && onResolveAlert(a.id)}
                            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
