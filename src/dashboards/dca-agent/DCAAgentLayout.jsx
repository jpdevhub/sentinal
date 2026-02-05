import { useState } from 'react';
import { 
  Zap, 
  Trophy, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { useNavigate } from 'react-router-dom';
import logoImg from '../../assets/logo.png';
import './DCAAgentLayout.css';

function DCAAgentLayout({ children, activePage, onPageChange }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { signOut, user } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Get DCA display name
  const getDCADisplayName = (dcaId) => {
    const names = {
      'DCA_A': 'DCA Alpha',
      'DCA_B': 'DCA Beta',
      'DCA_C': 'DCA Gamma',
      'DCA_D': 'DCA Delta',
      'DCA_8f3d1': 'DCA Epsilon',
      'DCA_9a2b4': 'DCA Zeta',
      'DCA_7c1d2': 'DCA Eta'
    };
    return names[dcaId] || dcaId;
  };

  const menuItems = [
    { id: 'smart-worklist', label: 'Smart Worklist', icon: Zap },
    { id: 'my-performance', label: 'My Performance', icon: BarChart3 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy }
  ];

  return (
    <div className="dca-agent-layout">
      {/* Sidebar */}
      <div className={`agent-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <img src={logoImg} alt="Logo" className="sidebar-logo" />
          {!sidebarCollapsed && (
            <div className="sidebar-brand">
              <span className="brand-primary">DCA</span>
              <span className="brand-secondary">Agent</span>
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
      <div className="agent-main">
        <div className="agent-topbar">
          <h1 className="page-title">
            {menuItems.find(item => item.id === activePage)?.label || 'Dashboard'}
          </h1>
          <div className="user-info-container">
            <div className="user-info-card">
              <div className="user-details">
                <span className="user-label">DCA AGENT PORTAL</span>
                <span className="user-email">{user?.email}</span>
              </div>
              <div className="user-badge">
                <div className="user-avatar">
                  <Users size={20} />
                </div>
                <span className="user-org-badge">{getDCADisplayName(profile?.organization_id)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="agent-content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default DCAAgentLayout;
