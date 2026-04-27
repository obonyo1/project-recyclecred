import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authService } from '../services/apiClient';
import './VerifyEmail.css';

export default function VerifyEmail() {
  const location    = useLocation();
  const email       = location.state?.email || '';
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState('');

  const handleResend = async () => {
    if (!email) { setError('No email address found. Please go back and sign up again.'); return; }
    setLoading(true); setError(''); setSuccess(false);
    const { error: resendError } = await authService.resendVerification(email);
    setLoading(false);
    if (resendError) setError(resendError || 'Failed to resend. Please try again.');
    else { setSuccess(true); setTimeout(() => setSuccess(false), 5000); }
  };

  return (
    <div className="verify-page">
      <div className="verify-container">
        <div className="verify-card">

          <div className="verify-icon">🔐</div>

          <div className="verify-header">
            <h1>Verify Your Email</h1>
            {email
              ? <><p>A verification link was sent to</p><p className="email-address">{email}</p></>
              : <p>Check your inbox for a verification link.</p>
            }
            <p style={{ fontSize: 13, color: '#6B7B6E', marginTop: 8 }}>
              Click the link in your email to activate your account.
              You will be redirected to login automatically.
            </p>
          </div>

          {error   && <div className="error-message">{error}</div>}
          {success && <div className="success-message">Verification email sent! Check your inbox.</div>}

          <div className="resend-section">
            <p>Didn't receive the email?</p>
            <button className="resend-button" onClick={handleResend} disabled={loading}>
              {loading ? 'Sending...' : 'Resend Verification Email'}
            </button>
          </div>

          <div className="verify-footer">
            <Link to="/signup">← Back to Sign Up</Link>
          </div>

        </div>
      </div>
    </div>
  );
}