import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/apiClient';
import './Login.css';

export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [form,    setForm]    = useState({ email:'', password:'' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const justVerified = new URLSearchParams(location.search).get('verified') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = {};
    if (!form.email)    e2.email    = 'Email is required';
    if (!form.password) e2.password = 'Password is required';
    if (Object.keys(e2).length) { setErrors(e2); return; }

    setLoading(true);
    setErrors({});
    const { data, error } = await authService.login({ email: form.email.trim().toLowerCase(), password: form.password });
    setLoading(false);

    if (error) {
      if (error.includes('verify') || error.includes('EMAIL_NOT_VERIFIED'))
        setErrors({ email: 'Please verify your email first. Check your inbox.' });
      else if (error.includes('Invalid'))
        setErrors({ password: 'Invalid email or password.' });
      else setErrors({ general: error });
      return;
    }
    navigate(location.state?.from || '/customer/dashboard', { replace: true });
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <Link to="/" className="login-logo"><span>♻️</span> <span className="logo-text">RecycleCred</span></Link>
            <h1>Welcome Back</h1>
            <p>Sign in to access your personalised recycling dashboard</p>
          </div>

          {justVerified && <div className="success-message">✅ Email verified! You can now sign in.</div>}
          {errors.general && <div className="error-message">{errors.general}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-field">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" placeholder="jane@example.com"
                value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} autoComplete="email" />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            <div className="form-field" style={{ marginBottom:8 }}>
              <label className="form-label">Password</label>
              <input type="password" className="form-input" placeholder="Your password"
                value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} autoComplete="current-password" />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>
            <div className="form-options">
              <span />
              <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
            </div>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="login-footer">
            <p>Don't have an account? <Link to="/signup">Sign up free</Link></p>
            <p style={{ marginTop:8 }}>Are you an agent? <Link to="/agent/login">Agent login →</Link></p>
          </div>
        </div>
        <div className="back-link"><Link to="/" className="back-button">← Back to Home</Link></div>
      </div>
    </div>
  );
}