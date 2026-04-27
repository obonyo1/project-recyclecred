import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/apiClient';
import './Signup.css';

const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=account, 2=profile
  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', password: '', confirmPassword: '',
    income_level: '', referral_code: '',
  });
  const [errors,    setErrors]    = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateStep1 = () => {
    const e = {};
    if (!formData.full_name.trim())                                      e.full_name       = 'Full name is required';
    if (!formData.email.trim())                                          e.email           = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))        e.email           = 'Enter a valid email address';
    if (!formData.password)                                              e.password        = 'Password is required';
    else if (formData.password.length < 8)                               e.password        = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword)                  e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!formData.income_level) e.income_level = 'Please select your income level — it affects your offer';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setIsLoading(true);
    setErrors({});

    // Try to get user's location for proximity scoring
    let registered_lat = null, registered_lng = null;
    try {
      await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => { registered_lat = pos.coords.latitude; registered_lng = pos.coords.longitude; resolve(); },
          () => resolve(),
          { timeout: 5000 }
        );
      });
    } catch {}

    const { data, error } = await authService.register({
      email:          formData.email.trim().toLowerCase(),
      password:       formData.password,
      full_name:      formData.full_name.trim(),
      phone:          formData.phone.trim() || undefined,
      income_level:   formData.income_level,
      referral_code:  formData.referral_code.trim() || undefined,
      registered_lat, registered_lng,
    });

    setIsLoading(false);

    if (error) {
      if (error.includes('already exists')) setErrors({ email: 'An account with this email already exists.' });
      else setErrors({ general: error });
      setStep(1);
      return;
    }

    navigate('/check-email', { state: { email: formData.email.trim().toLowerCase() } });
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-card">

          <div className="signup-header">
            <Link to="/" className="signup-logo">
              <span>♻️</span> <span className="logo-text">RecycleCred</span>
            </Link>
            <h1>Create Account</h1>
            <p>Join the RecycleCred community</p>
          </div>

          {/* Progress indicator */}
          <div className="signup-steps">
            <div className={`signup-step ${step >= 1 ? 'active' : ''}`}>
              <span>1</span> Account
            </div>
            <div className="signup-step-line" />
            <div className={`signup-step ${step >= 2 ? 'active' : ''}`}>
              <span>2</span> Profile
            </div>
          </div>

          {errors.general && <div className="error-message general-error">{errors.general}</div>}

          {/* ── Step 1: Account ── */}
          {step === 1 && (
            <form className="signup-form" onSubmit={handleNext} noValidate>

              <div className="form-field">
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input type="text" name="full_name" className="form-input"
                  placeholder="Jane Doe" value={formData.full_name} onChange={handleChange} autoComplete="name" />
                {errors.full_name && <span className="field-error">{errors.full_name}</span>}
              </div>

              <div className="form-field">
                <label className="form-label">Email Address <span className="required">*</span></label>
                <input type="email" name="email" className="form-input"
                  placeholder="jane@example.com" value={formData.email} onChange={handleChange} autoComplete="email" />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-field">
                <label className="form-label">Phone Number (Optional)</label>
                <input type="tel" name="phone" className="form-input"
                  placeholder="+254 7XX XXX XXX" value={formData.phone} onChange={handleChange} autoComplete="tel" />
              </div>

              <div className="form-field">
                <label className="form-label">Password <span className="required">*</span></label>
                <input type="password" name="password" className="form-input"
                  placeholder="Min. 8 characters" value={formData.password} onChange={handleChange} autoComplete="new-password" />
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              <div className="form-field">
                <label className="form-label">Confirm Password <span className="required">*</span></label>
                <input type="password" name="confirmPassword" className="form-input"
                  placeholder="Repeat your password" value={formData.confirmPassword} onChange={handleChange} autoComplete="new-password" />
                {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
              </div>

              <button type="submit" className="submit-button">Next: Profile →</button>
            </form>
          )}

          {/* ── Step 2: Profile ── */}
          {step === 2 && (
            <form className="signup-form" onSubmit={handleSubmit} noValidate>

              <div className="income-info-box">
                <strong>Why we ask this:</strong> Your income level directly affects your
                credit offer. Low-income users receive a higher behavioural uplift (β) to
                make recycling worthwhile — this is built into the pricing formula.
              </div>

              <div className="form-field">
                <label className="form-label">Income Level <span className="required">*</span></label>
                <div className="income-options">
                  {[
                    { value:'low',    label:'Low Income',    sub:'Uplift factor I = 0.8 (highest subsidy)', icon:'🔺' },
                    { value:'medium', label:'Middle Income', sub:'Uplift factor I = 0.5',                   icon:'▶️' },
                    { value:'high',   label:'High Income',   sub:'Uplift factor I = 0.2',                   icon:'🔻' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className={`income-option ${formData.income_level === opt.value ? 'selected' : ''}`}
                    >
                      <input
                        type="radio" name="income_level"
                        value={opt.value}
                        checked={formData.income_level === opt.value}
                        onChange={handleChange}
                        style={{ display:'none' }}
                      />
                      <span className="income-icon">{opt.icon}</span>
                      <span className="income-label">{opt.label}</span>
                      <span className="income-sub">{opt.sub}</span>
                    </label>
                  ))}
                </div>
                {errors.income_level && <span className="field-error">{errors.income_level}</span>}
              </div>

              <div className="form-field">
                <label className="form-label">Referral Code (Optional)</label>
                <input type="text" name="referral_code" className="form-input"
                  placeholder="Enter code if you were referred"
                  value={formData.referral_code} onChange={handleChange} />
                <span className="field-hint">Referred users start with a higher awareness score</span>
              </div>

              <div className="location-note">
                📍 We'll request your location to compute your proximity to the nearest
                certified collection point — this also affects your uplift score.
              </div>

              <div className="form-terms">
                <label className="checkbox-label">
                  <input type="checkbox" required />
                  <span>I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></span>
                </label>
              </div>

              <div style={{ display:'flex', gap:12 }}>
                <button type="button" className="back-btn" onClick={() => setStep(1)}>← Back</button>
                <button type="submit" className="submit-button" disabled={isLoading} style={{ flex:1 }}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>

            </form>
          )}

          <div className="signup-footer">
            <p>Already have an account? <Link to="/login">Sign in</Link></p>
          </div>
        </div>

        <div className="back-link">
          <Link to="/" className="back-button">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;