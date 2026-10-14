import React from 'react';
import StatusBadge from './StatusBadge';
import { MapPin, Wifi, WifiOff, Clock, ArrowRight, Gauge } from 'lucide-react';

export default function BinCard({ bin, onInspect }) {
  const {
    id,
    name,
    location,
    fill_percentage,
    distance_cm,
    status,
    is_online,
    priority,
    action,
    last_reading_time
  } = bin;

  const fill = fill_percentage !== null ? fill_percentage : 0;

  // Determine progress bar color
  let barColor = '#16A34A';
  if (status === 'FULL') barColor = '#DC2626';
  else if (status === 'HIGH') barColor = '#D97706';
  else if (status === 'MEDIUM') barColor = '#087E8B';
  else if (status === 'SENSOR ERROR') barColor = '#9333EA';
  else if (status === 'OFFLINE') barColor = '#64748B';

  const timeFormatted = last_reading_time
    ? new Date(last_reading_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Never';

  return (
    <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onInspect(id)}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{id}</span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: priority <= 2 ? '#FEE2E2' : '#F1F5F9',
                color: priority <= 2 ? '#B91C1C' : '#475569'
              }}
            >
              Priority #{priority}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
            <MapPin size={13} />
            <span>{location}</span>
          </div>
        </div>

        <StatusBadge status={status} />
      </div>

      {/* Fill Level Readout */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '2.2rem', fontWeight: 800, color: barColor, letterSpacing: '-0.03em' }}>
            {status === 'SENSOR ERROR' ? '--' : `${fill}%`}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Fill Capacity</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          <Gauge size={14} />
          <span>{status === 'SENSOR ERROR' || distance_cm < 0 ? 'Fault' : `${distance_cm} cm`}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${status === 'SENSOR ERROR' ? 100 : fill}%`,
            height: '100%',
            backgroundColor: barColor,
            transition: 'width 0.4s ease-in-out',
            opacity: status === 'SENSOR ERROR' ? 0.35 : 1
          }}
        />
      </div>

      {/* Recommended Action Summary */}
      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, minHeight: '34px' }}>
        {action}
      </p>

      {/* Card Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '10px',
          marginTop: '4px',
          fontSize: '0.74rem',
          color: 'var(--text-secondary)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {is_online ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16A34A', fontWeight: 600 }}>
              <Wifi size={13} /> Online
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontWeight: 600 }}>
              <WifiOff size={13} /> Offline
            </span>
          )}
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={12} /> {timeFormatted}
          </span>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onInspect(id);
          }}
          style={{ padding: '3px 8px', fontSize: '0.72rem' }}
        >
          <span>Inspect</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
