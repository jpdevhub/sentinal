import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import loginPageImg from '../assets/loginPage.png';
import verifyImg from '../assets/verify.png';
import noImg from '../assets/no.png';
import logoImg from '../assets/logo.png';
import './Login.css';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationType, setOrganizationType] = useState('');
  const [selectedDCA, setSelectedDCA] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, user, loading: authLoading } = useAuth();
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
    setSuccess('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!organizationType.trim()) {
      setError('Please select your organization type');
      return;
    }

    if (organizationType === 'Agency Manager' && !selectedDCA.trim()) {
      setError('Please select your DCA assignment');
      return;
    }

    setLoading(true);

    try {
      // Sign up the user with organization type and DCA selection
      const { data, error: signUpError } = await signUp(email, password, organizationType, selectedDCA);

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Check if email confirmation is required
      if (data?.user && !data?.session) {
        // Email confirmation is enabled - user needs to check email
        setSuccess('Account created! Please check your email to confirm your account. The confirmation link will redirect you to the dashboard.');
        setLoading(false);
      } else if (data?.session) {
        // Email confirmation is disabled - user is automatically logged in
        setSuccess('Account created successfully! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

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
          <h2 className="form-title">Create your account</h2>
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
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
                placeholder="Enter your password (min 6 characters)"
              />
            </div>

            <div className="form-group">
              <label htmlFor="organizationType">Organisation Type</label>
              <select
                id="organizationType"
                value={organizationType}
                onChange={(e) => {
                  setOrganizationType(e.target.value);
                  if (e.target.value !== 'Agency Manager') {
                    setSelectedDCA(''); // Reset DCA selection if not Agency Manager
                  }
                }}
                required
                className="form-select"
              >
                <option value="">Select your role...</option>
                <option value="FedEx Administrator">FedEx Administrator</option>
                <option value="Agency Manager">Agency Manager</option>
                <option value="Agency Agent">Agency Agent</option>
              </select>
            </div>

            {organizationType === 'Agency Manager' && (
              <div className="form-group">
                <label htmlFor="selectedDCA">DCA Assignment</label>
                <select
                  id="selectedDCA"
                  value={selectedDCA}
                  onChange={(e) => setSelectedDCA(e.target.value)}
                  required
                  className="form-select"
                >
                  <option value="">Select your DCA...</option>
                  <option value="DCA_A">DCA Alpha (DCA_A)</option>
                  <option value="DCA_B">DCA Beta (DCA_B)</option>
                  <option value="DCA_C">DCA Gamma (DCA_C)</option>
                  <option value="DCA_D">DCA Delta (DCA_D)</option>                  <option value="DCA_8f3d1">DCA Epsilon (DCA_8f3d1)</option>
                  <option value="DCA_9a2b4">DCA Zeta (DCA_9a2b4)</option>
                  <option value="DCA_7c1d2">DCA Eta (DCA_7c1d2)</option>                </select>
              </div>
            )}

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" disabled={loading} className="btn-login">
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <p className="signup-link">
            Already have an account? <a href="/login">Login</a>
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
