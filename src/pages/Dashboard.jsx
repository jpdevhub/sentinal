import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useNavigate } from 'react-router-dom';
import SplashScreen from '../components/SplashScreen';
import DashboardLayout from '../components/DashboardLayout';
import FedExAdminDashboard from '../components/FedExAdminDashboard';
import AllocationDashboard from '../components/AllocationDashboard';
import CaseManager from '../components/CaseManager';
import DCAPerformanceAnalytics from '../components/DCAPerformanceAnalytics';
import GovernanceConsole from '../components/GovernanceConsole';
// Import new DCA Manager and Agent Pages
import DCAManagerPage from '../dashboards/dca-manager/DCAManagerPage';
import DCAAgentPage from '../dashboards/dca-agent/DCAAgentPage';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Show loading while profile is being fetched
  if (profileLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fff'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #2d2d2d',
          borderTop: '4px solid #9c27b0',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <p>Loading your dashboard...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If no profile exists, redirect to login or show error
  if (!profile && !profileLoading && user) {
    const handleSignUpAgain = async () => {
      // Sign out properly and redirect to signup
      await signOut();
      localStorage.clear();
      navigate('/signup');
    };

    const handleBackToLogin = async () => {
      // Sign out properly and redirect to login  
      await signOut();
      localStorage.clear();
      navigate('/login');
    };

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fff'
      }}>
        <div style={{ textAlign: 'center', padding: '20px', maxWidth: '400px' }}>
          <h2 style={{ color: '#fff', marginBottom: '16px' }}>Profile Setup Required</h2>
          <p style={{ color: '#ccc', marginBottom: '8px' }}>
            No profile found for your account. Please sign up again to create your profile.
          </p>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
            User: {user?.email}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              onClick={handleSignUpAgain}
              style={{
                backgroundColor: '#9c27b0',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Sign Up Again
            </button>
            <button 
              onClick={handleBackToLogin}
              style={{
                backgroundColor: '#2d2d2d',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // DCA Manager gets their own dedicated layout and pages
  if (profile?.role === 'DCA_MANAGER') {
    return <DCAManagerPage />;
  }

  // DCA Agent gets their own dedicated layout and pages
  if (profile?.role === 'DCA_AGENT') {
    return <DCAAgentPage />;
  }

  const renderRoleBasedDashboard = () => {
    // If no profile, show the default AllocationDashboard
    if (!profile) {
      return <AllocationDashboard />;
    }

    switch (profile.role) {
      case 'FEDEX_ADMIN':
        return <FedExAdminDashboard />;
      case 'DCA_MANAGER':
        return <DCAManagerPage />;
      case 'DCA_AGENT':
        return <DCAAgentPage />;
      default:
        return <AllocationDashboard />; // Fallback
    }
  };

  const renderPageContent = () => {
    switch (activePage) {
      case 'dashboard':
        return renderRoleBasedDashboard();
      case 'cases':
        return <CaseManager key="case-manager" />;
      case 'dca-performance':
        return <DCAPerformanceAnalytics key="dca-performance" />;
      case 'governance':
        return <GovernanceConsole key={`governance-${Date.now()}`} />;
      default:
        return renderRoleBasedDashboard();
    }
  };

  return (
    <DashboardLayout activePage={activePage} onPageChange={setActivePage}>
      {renderPageContent()}
    </DashboardLayout>
  );
}
