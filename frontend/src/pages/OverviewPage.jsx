import React from 'react';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import {
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  WifiOff,
  Percent,
  TrendingUp,
  BarChart2,
  PieChart as PieIcon,
  ListOrdered,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

const CHART_COLORS = ['#087E8B', '#2563EB', '#6366F1', '#8B5CF6', '#14B8A6', '#0EA5E9'];

export default function OverviewPage({ analytics, bins = [], onInspectBin }) {
  const summary = analytics?.summary || {
    total_bins: bins.length,
    normal_bins: bins.filter(b => b.status === 'LOW' || b.status === 'MEDIUM').length,
    collection_needed_bins: bins.filter(b => b.status === 'HIGH').length,
    full_bins: bins.filter(b => b.status === 'FULL').length,
    offline_bins: bins.filter(b => !b.is_online || b.status === 'OFFLINE').length,
    average_fill_percentage: 0
  };

  const statusDistribution = analytics?.status_distribution || [];
  const binComparison = analytics?.bin_fill_comparison || [];
  const priorityRanking = analytics?.priority_ranking || [...bins].sort((a, b) => a.priority - b.priority);
  const trendReadings = analytics?.trend_readings || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 6 Key Performance Metric Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Total Registered Bins"
          value={summary.total_bins}
          subtext="Municipal monitored receptacles"
          icon={Trash2}
          color="#087E8B"
          bg="#E0F2FE"
        />
        <MetricCard
          label="Normal / Healthy Bins"
          value={summary.normal_bins}
          subtext="Capacity within safe limits (<80%)"
          icon={CheckCircle2}
          color="#16A34A"
          bg="#DCFCE7"
        />
        <MetricCard
          label="Collection Needed"
          value={summary.collection_needed_bins}
          subtext="Schedule for today's pickup (80-94%)"
          icon={AlertTriangle}
          color="#D97706"
          bg="#FEF3C7"
        />
        <MetricCard
          label="Critical / Full Bins"
          value={summary.full_bins}
          subtext="Urgent dispatch required (>=95%)"
          icon={AlertOctagon}
          color="#DC2626"
          bg="#FEE2E2"
        />
        <MetricCard
          label="Offline Devices"
          value={summary.offline_bins}
          subtext="Stale telemetry or no power"
          icon={WifiOff}
          color="#64748B"
          bg="#F1F5F9"
        />
        <MetricCard
          label="Average City Fill"
          value={`${summary.average_fill_percentage}%`}
          subtext="Across all active online nodes"
          icon={Percent}
          color="#166534"
          bg="#DCFCE7"
        />
      </div>

      {/* Main Charts Row */}
      <div className="charts-grid">
        {/* Fill Percentage by Bin (Bar Chart) */}
        <div className="content-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <BarChart2 size={18} color="#087E8B" />
                Fill Capacity by Garbage Bin
              </h2>
              <span className="card-subtitle">Real-time percentage comparison across municipal zones</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '310px' }}>
            {binComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={binComparison} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="id" angle={-25} textAnchor="end" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name, props) => [`${value}%`, `Fill (${props.payload.location})`]}
                  />
                  <Bar dataKey="fill_percentage" name="Fill %" radius={[6, 6, 0, 0]}>
                    {binComparison.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                No active bin telemetry available.
              </div>
            )}
          </div>
        </div>

        {/* Telemetry Trend Over Time (Line Chart) */}
        <div className="content-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <TrendingUp size={18} color="#087E8B" />
                City Fill-Level Dynamics Over Time
              </h2>
              <span className="card-subtitle">Chronological ultrasonic sensor trend streams</span>
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
                    name="Fill Level (%)"
                    stroke="#2563EB"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#2563EB' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                Awaiting continuous telemetry readings...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Row: Status Distribution & Collection Priority */}
      <div className="charts-grid">
        {/* Status Distribution (Donut Chart) */}
        <div className="content-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <PieIcon size={18} color="#D97706" />
                Municipal Fleet Status Distribution
              </h2>
              <span className="card-subtitle">Current status breakdown across all installed devices</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '290px' }}>
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {statusDistribution.map((_, index) => (
                      <Cell key={`donut-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                No distribution data.
              </div>
            )}
          </div>
        </div>

        {/* Collection Priority Ranking Table */}
        <div className="content-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <ListOrdered size={18} color="#DC2626" />
                Collection Dispatch Priority Ranking
              </h2>
              <span className="card-subtitle">Bins prioritized automatically by urgency and fill volume</span>
            </div>
          </div>
          <div className="table-container" style={{ maxHeight: '260px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Bin ID</th>
                  <th>Location</th>
                  <th>Fill %</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {priorityRanking.slice(0, 6).map((bin, idx) => (
                  <tr
                    key={bin.id}
                    onClick={() => onInspectBin(bin.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 800, color: idx === 0 ? '#DC2626' : 'var(--text-primary)' }}>
                      #{idx + 1}
                    </td>
                    <td style={{ fontWeight: 700 }}>{bin.id}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{bin.location}</td>
                    <td style={{ fontWeight: 700 }}>
                      {bin.status === 'SENSOR ERROR' ? '--' : `${bin.fill_percentage ?? 0}%`}
                    </td>
                    <td>
                      <StatusBadge status={bin.status} />
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectBin(bin.id);
                        }}
                      >
                        Inspect <ArrowRight size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
