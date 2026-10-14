import React from 'react';

export default function MetricCard({ label, value, subtext, icon: Icon, color = '#16A34A', bg = '#DCFCE7' }) {
  return (
    <div className="metric-card">
      <div className="metric-card-top">
        <span className="metric-label">{label}</span>
        <div className="metric-icon-box" style={{ backgroundColor: bg, color }}>
          {Icon && <Icon size={20} />}
        </div>
      </div>
      <div className="metric-value-box">
        <span className="metric-number">{value}</span>
      </div>
      {subtext && <span className="metric-subtext">{subtext}</span>}
    </div>
  );
}
