import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { agentAuthService } from '../services/apiClient';
import './Login.css';

export default function AgentLogin() {
  const navigate  = useNavigate();
  const [form,    setForm]    = useState({ email:'', password:'' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErrors({});
    const { data, error } = await agentAuthService.login({ email: form.email.trim().toLowerCase(), password: form.password });
    setLoading(false);
    if (error) { setErrors({ general: error }); return; }
    navigate('/agent/dashboard');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <Link to="/" className="login-logo"><span>♻️</span> <span className="logo-text">RecycleCred</span></Link>
            <div style={{ background:'#E8F5EE', border:'1px solid #A5D6A7', borderRadius:8, padding:'6px 14px', display:'inline-block', marginBottom:12, fontSize:12, fontWeight:700, color:'#0D3B26', textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Agent Portal
            </div>
            <h1>Agent Sign In</h1>
            <p>Access the device assessment dashboard</p>
          </div>

          {errors.general && <div className="error-message">{errors.general}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-field">
              <label className="form-label">Agent Email</label>
              <input type="email" className="form-input" placeholder="agent@weee.co.ke"
                value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} autoComplete="email" />
            </div>
            <div className="form-field" style={{ marginBottom:20 }}>
              <label className="form-label">Password</label>
              <input type="password" className="form-input" placeholder="Your password"
                value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} autoComplete="current-password" />
            </div>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In to Agent Dashboard'}
            </button>
          </form>

          <div className="login-footer">
            <p>Customer? <Link to="/login">Customer login →</Link></p>
          </div>
        </div>
        <div className="back-link"><Link to="/" className="back-button">← Back to Home</Link></div>
      </div>
    </div>
  );
}