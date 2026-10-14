import React from 'react';
import { Menu, Radio } from 'lucide-react';

export default function Header({
  onToggleSidebar,
  isConnected
}) {
  return (
    <header className="top-header">
      <div className="header-left">
        <button
          className="collapse-btn"
          onClick={onToggleSidebar}
          title="Toggle Navigation Sidebar"
          id="btn-toggle-sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="header-title-group">
          <h1>SmartBin</h1>
          <p>Waste monitoring dashboard</p>
        </div>
      </div>

      <div className="header-right">
        <div
          className={`live-badge ${isConnected ? 'online' : 'disconnected'}`}
          title={isConnected ? 'Connected to SmartBin Telemetry Gateway' : 'Disconnected from Backend Server'}
        >
          <span className="pulse-dot" />
          <Radio size={14} />
          <span>{isConnected ? 'LIVE TELEMETRY' : 'DISCONNECTED'}</span>
        </div>
      </div>
    </header>
  );
}
