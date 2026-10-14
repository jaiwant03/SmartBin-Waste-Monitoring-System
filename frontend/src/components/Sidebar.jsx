import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Trash2,
  AlertTriangle,
  Cpu,
  BarChart3,
  Settings,
  Waves
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'monitoring', label: 'Live Monitoring', icon: Activity },
  { id: 'management', label: 'Bin Management', icon: Trash2 },
  { id: 'alerts', label: 'Collection Alerts', icon: AlertTriangle, showBadge: true },
  { id: 'simulation', label: 'Sensor Simulation', icon: Cpu },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'System Settings', icon: Settings }
];

export default function Sidebar({
  activeView,
  onSelectView,
  isCollapsed,
  unreadAlertsCount = 0,
  isSimulating = true
}) {
  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-icon-box">
          <Waves size={24} />
        </div>
        {!isCollapsed && (
          <div className="brand-info">
            <span className="brand-title">SmartBin</span>
            <span className="brand-sub">Municipal IoT v1.0</span>
          </div>
        )}
      </div>

      {/* Nav List */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectView(item.id)}
              title={isCollapsed ? item.label : undefined}
              id={`nav-link-${item.id}`}
            >
              <Icon size={19} />
              {!isCollapsed && <span>{item.label}</span>}
              {!isCollapsed && item.showBadge && unreadAlertsCount > 0 && (
                <span className="nav-badge">{unreadAlertsCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Pill */}
      {!isCollapsed && (
        <div className="sidebar-footer">
          <div className={`mode-pill ${isSimulating ? '' : 'offline'}`}>
            <span className="pulse-dot" />
            <span>{isSimulating ? 'SIMULATION MODE' : 'HARDWARE STANDBY'}</span>
          </div>
        </div>
      )}
    </aside>
  );
}
