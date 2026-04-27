import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authService } from '../services/apiClient';
import './CheckEmail.css';

export default function CheckEmail() {
  const location = useLocation();
  const email    = location.state?.email || '';
  const [sending, setSending] = useState(false);
  const [msg,     setMsg]     = useState('');
  const [err,     setErr]     = useState('');

  const handleResend = async () => {
    if (!email) { setErr('No email address. Please sign up again.'); return; }
    setSending(true); setMsg(''); setErr('');
    const { error } = await authService.resendVerification(email);
    setSending(false);
    if (error) setErr(error);
    else setMsg('Verification email sent! Check your inbox.');
  };

  return (
    <div className="check-email-page">
      <div className="check-email-container">
        <div className="check-email-card">
          <div className="email-icon">📧</div>
          <h1>Check Your Email</h1>
          {email && <p>We sent a verification link to <strong>{email}</strong></p>}
          <p className="secondary-text">Click the link in your inbox to activate your account. You'll be redirected to login automatically.</p>
          {err && <div className="error-message">{err}</div>}
          {msg && <div className="success-message">{msg}</div>}
          <div className="resend-section">
            <p>Didn't receive it?</p>
            <button onClick={handleResend} disabled={sending} className="resend-button">
              {sending ? 'Sending...' : 'Resend Verification Email'}
            </button>
          </div>
          <div className="check-email-footer">
            <p>Already verified? <Link to="/login">Sign in</Link></p>
          </div>
          <div className="back-link" style={{ textAlign:'center', marginTop:12 }}>
            <Link to="/" style={{ color:'#6B7B6E', fontSize:13 }}>← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
