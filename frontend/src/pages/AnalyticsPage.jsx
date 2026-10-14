import React from 'react';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import {
  BarChart3,
  TrendingUp,
  MapPin,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Trash2,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

const CHART_COLORS = ['#087E8B', '#2563EB', '#6366F1', '#8B5CF6', '#14B8A6', '#0EA5E9'];

export default function AnalyticsPage({ analytics, bins = [], onInspectBin }) {
  const summary = analytics?.summary || {
    total_bins: bins.length,
    average_fill_percentage: 0,
    active_alerts_count: 0,
    resolved_alerts_count: 0,
    sensor_error_bins: 0
  };

  const locationBreakdown = analytics?.location_breakdown || [];
  const trendReadings = analytics?.trend_readings || [];
  const priorityRanking = analytics?.priority_ranking || bins;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div className="content-card" style={{ padding: '20px 24px' }}>
        <h2 className="card-title">
          <BarChart3 size={20} color="#087E8B" />
          Municipal Waste Generation & Telemetry Analytics
        </h2>
        <p className="card-subtitle">
          Longitudinal insights, location-based waste accumulation metrics, sensor reliability, and collection dispatch metrics.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Total Fleet Size"
          value={summary.total_bins}
          subtext="Active sensor nodes"
          icon={Trash2}
          color="#087E8B"
          bg="#E0F2FE"
        />
        <MetricCard
          label="Fleet Average Fill"
          value={`${summary.average_fill_percentage}%`}
          subtext="Aggregate capacity utilization"
          icon={TrendingUp}
          color="#16A34A"
          bg="#DCFCE7"
        />
        <MetricCard
          label="Active Incidents"
          value={summary.active_alerts_count}
          subtext="Unresolved overflows / errors"
          icon={AlertTriangle}
          color="#DC2626"
          bg="#FEE2E2"
        />
        <MetricCard
          label="Resolved Collections"
          value={summary.resolved_alerts_count}
          subtext="Successful truck dispatches"
          icon={CheckCircle2}
          color="#166534"
          bg="#DCFCE7"
        />
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Average Fill by Location (Bar Chart) */}
        <div className="content-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <MapPin size={18} color="#087E8B" />
                Waste Accumulation by Municipal Location
              </h2>
              <span className="card-subtitle">Average fill percentage per city sector</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '310px' }}>
            {locationBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="location" angle={-25} textAnchor="end" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Average Fill']} />
                  <Bar dataKey="average_fill" radius={[6, 6, 0, 0]} fill="#087E8B">
                    {locationBreakdown.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                No location metrics available.
              </div>
            )}
          </div>
        </div>

        {/* Temporal Fill Trends (Line Chart) */}
        <div className="content-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <TrendingUp size={18} color="#087E8B" />
                Real-Time Telemetry Trend Stream
              </h2>
              <span className="card-subtitle">Chronological progression of sensor readings</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '310px' }}>
            {trendReadings.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendReadings} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="fill_percentage"
                    stroke="#2563EB"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#2563EB' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                Awaiting continuous telemetry updates...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Critical Receptacles Priority Table */}
      <div className="content-card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Layers size={18} color="#DC2626" />
              Highest-Priority Collection Candidates
            </h2>
            <span className="card-subtitle">Sorted by municipal collection dispatch urgency</span>
          </div>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Bin ID</th>
                <th>Location</th>
                <th>Fill Level</th>
                <th>Echo Distance</th>
                <th>Status</th>
                <th>Recommended Action</th>
              </tr>
            </thead>
            <tbody>
              {priorityRanking.map(bin => (
                <tr key={bin.id} onClick={() => onInspectBin && onInspectBin(bin.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 800 }}>#{bin.priority}</td>
                  <td style={{ fontWeight: 700 }}>{bin.id}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{bin.location}</td>
                  <td style={{ fontWeight: 700 }}>{bin.fill_percentage !== null ? `${bin.fill_percentage}%` : 'Fault'}</td>
                  <td>{bin.distance_cm > 0 ? `${bin.distance_cm} cm` : 'Fault'}</td>
                  <td>
                    <StatusBadge status={bin.status} />
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {bin.action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
