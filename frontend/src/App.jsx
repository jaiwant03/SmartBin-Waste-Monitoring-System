import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BinDetailModal from './components/BinDetailModal';
import OverviewPage from './pages/OverviewPage';
import MonitoringPage from './pages/MonitoringPage';
import BinManagementPage from './pages/BinManagementPage';
import AlertsPage from './pages/AlertsPage';
import SimulationPage from './pages/SimulationPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import { useSmartBin } from './hooks/useSmartBin';
import { WifiOff } from 'lucide-react';
import './styles/theme.css';
import './styles/dashboard.css';
import './styles/simulator.css';

export default function App() {
  const [activeView, setActiveView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') || 'overview';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const {
    bins,
    alerts,
    analytics,
    settings,
    simulation,
    isConnected,
    loading,
    error,
    selectedBinId,
    selectedBinDetails,
    unreadAlertsCount,
    setSelectedBinId,
    refreshData,
    handleResolveAlert,
    handleSimulationControl
  } = useSmartBin();

  return (
    <div className="app-container">
      {/* Persistent Municipal Sidebar */}
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        isCollapsed={isSidebarCollapsed}
        unreadAlertsCount={unreadAlertsCount}
        isSimulating={simulation.is_running}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Header
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isConnected={isConnected}
        />

        {/* Global Error / Offline Alert Banner if disconnected */}
        {!isConnected && (
          <div
            style={{
              padding: '10px 24px',
              backgroundColor: '#FEF2F2',
              borderBottom: '1px solid #FECACA',
              color: '#B91C1C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              fontWeight: 600
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <WifiOff size={16} />
              <span>Disconnected from SmartBin backend gateway. Attempting automatic reconnection...</span>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={refreshData}
              style={{ padding: '2px 8px', fontSize: '0.74rem' }}
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Viewport Content */}
        <main className="page-content">
          {activeView === 'overview' && (
            <OverviewPage
              analytics={analytics}
              bins={bins}
              onInspectBin={setSelectedBinId}
            />
          )}

          {activeView === 'monitoring' && (
            <MonitoringPage
              bins={bins}
              onInspectBin={setSelectedBinId}
            />
          )}

          {activeView === 'management' && (
            <BinManagementPage
              bins={bins}
              onRefresh={refreshData}
            />
          )}

          {activeView === 'alerts' && (
            <AlertsPage
              alerts={alerts}
              onResolveAlert={handleResolveAlert}
              onInspectBin={(id) => {
                setSelectedBinId(id);
              }}
            />
          )}

          {activeView === 'simulation' && (
            <SimulationPage
              bins={bins}
              simulation={simulation}
              onSimulationControl={handleSimulationControl}
            />
          )}

          {activeView === 'analytics' && (
            <AnalyticsPage
              analytics={analytics}
              bins={bins}
              onInspectBin={setSelectedBinId}
            />
          )}

          {activeView === 'settings' && (
            <SettingsPage
              settings={settings}
              onRefresh={refreshData}
            />
          )}
        </main>
      </div>

      {/* Bin Inspector Modal / Drawer */}
      {selectedBinId && (
        <BinDetailModal
          bin={selectedBinDetails || bins.find(b => b.id === selectedBinId)}
          onClose={() => setSelectedBinId(null)}
          onResolveAlert={handleResolveAlert}
        />
      )}
    </div>
  );
}
