import { useState } from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  TrendingUp, 
  Shield, 
  Users, 
  Clock, 
  Package, 
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import './DashboardLayout.css';

function DashboardLayout({ children, activePage, onPageChange }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cases', label: 'All Cases', icon: FolderKanban },
    { id: 'dca-performance', label: 'DCA Performance', icon: TrendingUp },
    { id: 'governance', label: 'Governance', icon: Shield }
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <div className={`dashboard-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <img src={logoImg} alt="FedEx Logo" className="sidebar-logo" />
          {!sidebarCollapsed && (
            <div className="sidebar-brand">
              <span className="fed-text">Fed</span>
              <span className="ex-text">Ex</span>
              <span className="dca-text"> DCA</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => onPageChange(item.id)}
                title={sidebarCollapsed ? item.label : ''}
              >
                <Icon size={22} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleSignOut}>
            <LogOut size={22} />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>

        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        <div className="dashboard-topbar">
          <h1 className="page-title">
            {menuItems.find(item => item.id === activePage)?.label || 'Dashboard'}
          </h1>
          <div className="user-info-container">
            <div className="user-info-card">
              <div className="user-details">
                <span className="user-label">FEDEx CLIENT PORTAL</span>
                <span className="user-email">{user?.email}</span>
              </div>
              <div className="user-badge">
                <div className="user-avatar">
                  <Users size={20} />
                </div>
                <span className="user-org-badge">{user?.user_metadata?.organization_type || 'Client'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
