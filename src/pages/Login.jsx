import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import loginPageImg from '../assets/loginPage.png';
import verifyImg from '../assets/verify.png';
import noImg from '../assets/no.png';
import logoImg from '../assets/logo.png';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already logged in (but wait for auth to finish loading)
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Don't set loading to false here - let the redirect happen
      navigate('/dashboard');
    }
  };

  // Show loading screen while auth is initializing
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fff'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="login-page">
      {/* Left Side - Purple Gradient with Illustration */}
      <div className="login-left">
        <div className="brand-section">
          <div className="brand-logo">
            <img src={logoImg} alt="Debts Recovery Logo" className="logo-image" />
            <div className="brand-text">
              <div className="brand-name">Sentinel</div>
              <div className="brand-tagline"></div>
            </div>
          </div>
        </div>

        <div className="illustration-container">
          <img src={loginPageImg} alt="Debt Recovery Illustration" className="login-illustration" />
          <img src={verifyImg} alt="Verify" className="verify-overlay" />
          <img src={noImg} alt="No" className="no-overlay" />
        </div>

        <div className="platform-info">
          <h1 className="platform-title">Debt Collection Management</h1>
          <h2 className="platform-subtitle"><span className="platform-highlight">Platform</span> with AI-Powered.</h2>
        </div>
      </div>

      {/* Right Side - White Form Section */}
      <div className="login-right">
        <div className="login-form-container">
          <h2 className="form-title">Sign in to your account</h2>
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="organizationType">Organization Type (Auto-detected)</label>
              <input
                id="organizationType"
                type="text"
                placeholder=""
                disabled
                className="org-type-input"
              />
            </div>

            <div className="form-options">
              <div className="remember-me">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="rememberMe">Remember me</label>
              </div>
              <a href="#" className="forgot-password">Forgot Password?</a>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={loading} className="btn-login">
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <p className="signup-link">
            Don't have an account? <a href="/signup">Sign Up</a>
          </p>

          <div className="form-footer">
            <a href="#">Contact</a>
            <span>|</span>
            <a href="#">Terms of Service</a>
            <span>|</span>
            <a href="#">Privacy Policy</a>
            <span>|</span>
            <a href="#">Disclaimer</a>
          </div>
          <div className="copyright">
            Copyright© 2026 Debts Recovery All Rights Reserved
          </div>
        </div>
      </div>
    </div>
  );
}