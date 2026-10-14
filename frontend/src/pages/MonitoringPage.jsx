import React, { useState, useMemo } from 'react';
import BinCard from '../components/BinCard';
import StatusBadge from '../components/StatusBadge';
import { Search, LayoutGrid, List, Filter, ArrowUpDown, ArrowRight, Gauge, Clock } from 'lucide-react';

export default function MonitoringPage({ bins = [], onInspectBin }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [sortBy, setSortBy] = useState('priority'); // 'priority' | 'fill_desc' | 'id'

  // Filter & Search logic
  const filteredBins = useMemo(() => {
    return bins
      .filter(bin => {
        const matchesSearch =
          bin.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bin.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (bin.name && bin.name.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;
        if (selectedStatus === 'ALL') return true;
        if (selectedStatus === 'NORMAL') return bin.status === 'LOW' || bin.status === 'MEDIUM';
        return bin.status === selectedStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return (b.fill_percentage || 0) - (a.fill_percentage || 0);
        }
        if (sortBy === 'fill_desc') {
          return (b.fill_percentage || 0) - (a.fill_percentage || 0);
        }
        if (sortBy === 'id') {
          return a.id.localeCompare(b.id);
        }
        return 0;
      });
  }, [bins, searchQuery, selectedStatus, sortBy]);

  const STATUS_PILLS = [
    { id: 'ALL', label: 'All Bins', count: bins.length },
    { id: 'NORMAL', label: 'Normal / Safe', count: bins.filter(b => b.status === 'LOW' || b.status === 'MEDIUM').length },
    { id: 'HIGH', label: 'Collection Needed', count: bins.filter(b => b.status === 'HIGH').length },
    { id: 'FULL', label: 'Critical / Full', count: bins.filter(b => b.status === 'FULL').length },
    { id: 'SENSOR ERROR', label: 'Sensor Error', count: bins.filter(b => b.status === 'SENSOR ERROR').length },
    { id: 'OFFLINE', label: 'Offline', count: bins.filter(b => !b.is_online || b.status === 'OFFLINE').length }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Search, Filter & Controls Bar */}
      <div className="content-card monitoring-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
            <Search
              size={17}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search by Bin ID, Location, or Name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '38px' }}
            />
          </div>

          {/* Sort dropdown & View Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUpDown size={15} color="var(--text-secondary)" />
              <select
                className="form-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{ padding: '7px 12px', fontSize: '0.84rem' }}
              >
                <option value="priority">Sort by Collection Priority</option>
                <option value="fill_desc">Sort by Highest Fill %</option>
                <option value="id">Sort by Bin ID</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '3px', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', padding: '4px' }}>
              <button
                className={`collapse-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
                style={{
                  padding: '6px 10px',
                  backgroundColor: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                  borderRadius: '6px',
                  boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                className={`collapse-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table View"
                style={{
                  padding: '6px 10px',
                  backgroundColor: viewMode === 'table' ? '#FFFFFF' : 'transparent',
                  borderRadius: '6px',
                  boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="monitoring-filters">
          {STATUS_PILLS.map(pill => (
            <button
              key={pill.id}
              onClick={() => setSelectedStatus(pill.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: selectedStatus === pill.id ? '1px solid var(--color-peacock-blue)' : '1px solid var(--border-color)',
                backgroundColor: selectedStatus === pill.id ? '#DDF1F2' : '#FFFFFF',
                color: selectedStatus === pill.id ? 'var(--color-peacock-dark)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{pill.label}</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  backgroundColor: selectedStatus === pill.id ? 'var(--color-peacock-blue)' : '#F1F5F9',
                  color: selectedStatus === pill.id ? '#FFFFFF' : 'var(--text-secondary)'
                }}
              >
                {pill.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area: Grid or Table */}
      {filteredBins.length === 0 ? (
        <div className="content-card" style={{ alignItems: 'center', padding: '40px 20px', textAlign: 'center' }}>
          <Filter size={36} color="var(--text-muted)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '8px' }}>No garbage bins match your criteria</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Try clearing your search query or choosing another status filter.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '22px' }}>
          {filteredBins.map(bin => (
            <BinCard key={bin.id} bin={bin} onInspect={onInspectBin} />
          ))}
        </div>
      ) : (
        <div className="content-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bin ID</th>
                  <th>Location</th>
                  <th>Fill %</th>
                  <th>Distance</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Connection</th>
                  <th>Last Telemetry</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBins.map(bin => (
                  <tr key={bin.id} onClick={() => onInspectBin(bin.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 800 }}>{bin.id}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{bin.location}</td>
                    <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {bin.status === 'SENSOR ERROR' ? '--' : `${bin.fill_percentage ?? 0}%`}
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                        <Gauge size={13} /> {bin.status === 'SENSOR ERROR' || bin.distance_cm < 0 ? 'Fault' : `${bin.distance_cm} cm`}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={bin.status} />
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: bin.priority <= 2 ? '#FEE2E2' : '#F1F5F9',
                          color: bin.priority <= 2 ? '#B91C1C' : '#475569'
                        }}
                      >
                        Priority #{bin.priority}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.76rem', color: bin.is_online ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                        {bin.is_online ? '● Online' : '○ Offline'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={12} /> {bin.last_reading_time ? new Date(bin.last_reading_time).toLocaleTimeString() : 'Never'}
                      </span>
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
      )}
    </div>
  );
}
