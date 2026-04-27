import { Link } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
  return (
    <div className="landing">

      {/* ── Nav ── */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <span className="logo-icon">♻️</span>
          <span className="logo-text">RecycleCred</span>
        </div>
        <div className="nav-links">
          <a href="#how-it-works">How It Works</a>
          <a href="#partners">Partners</a>
          <a href="#pricing">Pricing</a>
          <Link to="/login" className="nav-login">Log In</Link>
          <Link to="/signup" className="nav-cta">Get Started</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero-section">
        <div className="hero-badge">🌍 Nairobi's E-Waste Pricing Platform</div>
        <h1 className="hero-title">
          Turn Your Old Devices<br />
          Into <span className="hero-highlight">Real Money</span>
        </h1>
        <p className="hero-subtitle">
          RecycleCred uses AI and a behaviour-driven pricing model to give you a
          fair, transparent offer for your e-waste — paid instantly via M-Pesa.
          Partnered with WEEE Kenya, EWIK, and WeCollect.
        </p>
        <div className="hero-actions">
          <Link to="/signup" className="btn-hero-primary">
            Create Free Account →
          </Link>
          <Link to="/login" className="btn-hero-secondary">
            I Already Have an Account
          </Link>
        </div>
        <p className="hero-note">
          🔒 Login required to scan devices — your income level and location
          personalise your price offer.
        </p>
      </section>

      {/* ── How It Works ── */}
      <section className="how-section" id="how-it-works">
        <div className="section-label">The Process</div>
        <h2>Three Simple Steps</h2>
        <p className="section-sub">From device to M-Pesa in one straightforward transaction</p>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <div className="step-icon">📱</div>
            <h3>Scan Your Device</h3>
            <p>
              Take 4 photos of your device (front, back, left, right) and scan
              the IMEI or serial number. Our AI instantly reads the device
              identifier and assesses physical condition.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <div className="step-icon">💰</div>
            <h3>Get Your Personalised Offer</h3>
            <p>
              The platform computes your offer using device depreciation, AI
              condition scoring, market recovery rates, and a behavioural
              uplift tailored to your income level and proximity to a
              collection point.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <div className="step-icon">🏦</div>
            <h3>Drop Off & Get Paid</h3>
            <p>
              Choose a certified drop-off point or schedule a pickup. A
              trained agent completes a quick physical check, confirms the
              final price, and you receive instant M-Pesa payment.
            </p>
          </div>
        </div>
      </section>

      {/* ── Why Login ── */}
      <section className="why-section">
        <div className="why-card">
          <div className="why-icon">🎯</div>
          <div>
            <h3>Why Do I Need an Account?</h3>
            <p>
              Your credit offer is not a generic estimate — it's personalised
              to <strong>you</strong>. The platform factors in your declared
              income level, your proximity to the nearest certified agent,
              your recycling history (awareness score), and whether you've held
              the device past its expected upgrade cycle (hoarding score).
              These variables are part of the behavioural uplift formula
              β = α · I · P · (1+A) · (1+H) · (1−R·r), which can add up to
              KES 600 on top of the base device value.
              Without a profile, an accurate offer is impossible.
            </p>
          </div>
        </div>
      </section>

      {/* ── Partners ── */}
      <section className="partners-section" id="partners">
        <div className="section-label">Certified Partners</div>
        <h2>Licensed Recyclers We Work With</h2>
        <p className="section-sub">All collection points are EPR-compliant and regulated by NEMA</p>
        <div className="partners-grid">
          {[
            { name:'WEEE Kenya', desc:'Government-licensed e-waste processor with drop points across Nairobi', locations:'Westlands, Gigiri' },
            { name:'EWIK',       desc:'E-Waste Initiative Kenya — certified collector with industrial processing', locations:'Kasarani, Industrial Area' },
            { name:'WeCollect', desc:'Consumer-focused collection network with flexible pickup scheduling', locations:'South B, CBD' },
          ].map(p => (
            <div key={p.name} className="partner-card">
              <div className="partner-badge">✅ Certified</div>
              <h3>{p.name}</h3>
              <p>{p.desc}</p>
              <span className="partner-locations">📍 {p.locations}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing transparency ── */}
      <section className="pricing-section" id="pricing">
        <div className="section-label">The Formula</div>
        <h2>Transparent, Fair Pricing</h2>
        <p className="section-sub">Every variable is disclosed — no black box</p>
        <div className="formula-box">
          <div className="formula-row">
            <span className="formula-label">Depreciation</span>
            <code>D = max(0, 1 − t/n)</code>
          </div>
          <div className="formula-row">
            <span className="formula-label">Remote Quality</span>
            <code>Q_remote = 0.50·q_screen + 0.30·q_body + 0.20·q_ports</code>
          </div>
          <div className="formula-row">
            <span className="formula-label">Behavioural Uplift</span>
            <code>β = α · I · P · (1+A) · (1+H) · (1−R·r)</code>
          </div>
          <div className="formula-row highlight-row">
            <span className="formula-label">Your Credit</span>
            <code>C = max(C_min, OMV · D · Q · M) + β</code>
          </div>
          <p className="formula-note">
            C_min = KES 200 guaranteed floor. β adds up to KES 600 for low-income
            users far from collection points with older devices.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <h2>Ready to Recycle?</h2>
        <p>Create your free account in 2 minutes and get your first personalised offer today.</p>
        <Link to="/signup" className="btn-hero-primary">Create Free Account →</Link>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-logo">
          <span>♻️</span> RecycleCred
        </div>
        <p>© 2026 RecycleCred · Strathmore University, Nairobi · NEMA Compliant</p>
        <p style={{ fontSize:12, marginTop:4 }}>
          Partnered with WEEE Kenya, EWIK, WeCollect
        </p>
      </footer>

    </div>
  );
};

export default Landing;