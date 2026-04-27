/**
 * src/utils/pricing.js
 * RecycleCred Pricing Engine
 * Implements all four layers from the Variable Registry document.
 *
 * Layer 1 – Depreciation:   D = max(0, 1 − t/n)
 * Layer 2 – Remote quality: Q_remote = 0.50·q_screen + 0.30·q_body + 0.20·q_ports
 * Layer 2 – Agent quality:  Q_agent  = 0.35·q_function + 0.25·q_battery + 0.15·q_camera + 0.15·q_touch + 0.10·q_speaker
 * Layer 2 – Blended:        Q_final  = 0.35·Q_remote + 0.65·Q_agent
 * Layer 3 – Behavioural:    β = α · I · P · (1+A) · (1+H) · (1−R·r)
 * Layer 4 – Stage 1 range:  C_low  = max(C_min, OMV·D·Q_remote·M_low)  + β
 *                            C_high = max(C_min, OMV·D·Q_remote·M_high) + β
 * Layer 4 – Final:          C_final = max(C_min, OMV·D·Q_final·M) + β
 * Margin:                   π = R_recycler − C_final
 */

// ── Layer 1: Depreciation ────────────────────────────────
function computeDepreciation(t, n) {
  if (!n || n <= 0) return 0;
  return Math.max(0, 1 - t / n);
}

// ── Layer 2a: Remote quality (from user AI photos) ───────
function computeQRemote({ q_screen, q_body, q_ports }) {
  const qs = parseFloat(q_screen) || 0;
  const qb = parseFloat(q_body)   || 0;
  const qp = parseFloat(q_ports)  || 0;
  const Q  = 0.50 * qs + 0.30 * qb + 0.20 * qp;
  return Math.min(1.0, Math.max(0.3, parseFloat(Q.toFixed(3))));
}

// ── Layer 2b: Agent quality (physical checklist) ─────────
function computeQAgent({ q_function, q_battery, q_camera, q_touch, q_speaker }) {
  const qf = parseFloat(q_function) || 0;
  const qb = parseFloat(q_battery)  || 0;
  const qc = parseFloat(q_camera)   || 0;
  const qt = parseFloat(q_touch)    || 0;
  const qs = parseFloat(q_speaker)  || 0;
  const Q  = 0.35 * qf + 0.25 * qb + 0.15 * qc + 0.15 * qt + 0.10 * qs;
  return Math.min(1.0, Math.max(0.3, parseFloat(Q.toFixed(3))));
}

// ── Layer 2c: Blended quality score ─────────────────────
function computeQFinal(Q_remote, Q_agent) {
  const Q = 0.35 * Q_remote + 0.65 * Q_agent;
  return Math.min(1.0, Math.max(0.3, parseFloat(Q.toFixed(3))));
}

// ── Layer 3: Behavioural uplift β ────────────────────────
// α   = base subsidy (platform param, KES)
// I   = income factor (0.8 low / 0.5 medium / 0.2 high)
// P   = proximity score (1.0 ≤1km / 0.8 ≤5km / 0.6 >5km)
// A   = awareness score (0 new / 0.5 referred / 1.0 repeat)
// H   = hoarding score (0 / 0.5 / 1.0)
// R   = referral flag (0 or 1)
// r   = referral discount rate (0.30)
function computeBeta({ alpha, I, P, A, H, R, r }) {
  const beta = alpha * I * P * (1 + A) * (1 + H) * (1 - R * r);
  return Math.max(0, parseFloat(beta.toFixed(2)));
}

// ── Hoarding score H ─────────────────────────────────────
// Compares device age against expected upgrade cycle for income level
function computeHoardingScore(deviceAgeYears, incomeLevelLabel) {
  // Upgrade cycles by income level (years)
  const upgradeCycle = { low: 3, medium: 2, high: 1.5 };
  const cycle = upgradeCycle[incomeLevelLabel] || 2;
  const heldBeyond = deviceAgeYears - cycle;
  if (heldBeyond >= 2) return 1.0;
  if (heldBeyond >= 1) return 0.5;
  return 0.0;
}

// ── Proximity score P ─────────────────────────────────────
function computeProximityScore(distanceKm) {
  if (distanceKm <= 1)  return 1.0;
  if (distanceKm <= 5)  return 0.8;
  return 0.6;
}

// ── Layer 4: Stage 1 price range (shown before agent) ────
function computeStage1Range({ omv_kes, D, Q_remote, beta, m_low, m_high, c_min }) {
  const floor    = parseFloat(c_min) || 200;
  const assetLow  = parseFloat(omv_kes) * D * Q_remote * parseFloat(m_low);
  const assetHigh = parseFloat(omv_kes) * D * Q_remote * parseFloat(m_high);
  const c_low  = parseFloat((Math.max(floor, assetLow)  + beta).toFixed(2));
  const c_high = parseFloat((Math.max(floor, assetHigh) + beta).toFixed(2));
  return { c_low, c_high };
}

// ── Layer 4: Final price (after agent verification) ──────
function computeCFinal({ omv_kes, D, Q_final, M, beta, c_min }) {
  const floor  = parseFloat(c_min) || 200;
  const asset  = parseFloat(omv_kes) * D * Q_final * parseFloat(M);
  const c_final = parseFloat((Math.max(floor, asset) + beta).toFixed(2));
  return c_final;
}

// ── Platform margin π ─────────────────────────────────────
function computeMargin(r_recycler, c_final) {
  return parseFloat((parseFloat(r_recycler) - parseFloat(c_final)).toFixed(2));
}

// ── Full Stage 1 computation (user submits photos) ───────
// Returns all computed fields ready to be stored in devices table
function computeStage1(device, user, params, distanceKm) {
  const currentYear = new Date().getFullYear();

  const t = device.release_year ? currentYear - device.release_year : 0;
  const n = device.n || 5;
  const D = computeDepreciation(t, n);

  const q_remote = computeQRemote({
    q_screen: device.q_screen,
    q_body:   device.q_body,
    q_ports:  device.q_ports,
  });

  const H = computeHoardingScore(t, user.income_level || 'medium');
  const P = computeProximityScore(distanceKm || 5);
  const A = parseFloat(user.awareness_score) || 0;
  const I = parseFloat(user.income_factor)   || 0.5;
  const R = user.referral_flag ? 1 : 0;
  const r = parseFloat(params.referral_discount) || 0.30;
  const alpha = parseFloat(params.alpha) || 150;

  const beta = computeBeta({ alpha, I, P, A, H, R, r });

  const { c_low, c_high } = computeStage1Range({
    omv_kes: device.omv_kes || 0,
    D, Q_remote: q_remote, beta,
    m_low:  parseFloat(params.m_low)  || 1.05,
    m_high: parseFloat(params.m_high) || 1.30,
    c_min:  parseFloat(params.c_min)  || 200,
  });

  return {
    t: parseFloat(t.toFixed(1)),
    n,
    D: parseFloat(D.toFixed(3)),
    q_remote: parseFloat(q_remote.toFixed(3)),
    alpha_used:       alpha,
    income_factor:    I,
    proximity_score:  P,
    awareness_score:  A,
    hoarding_score:   H,
    referral_flag:    R,
    referral_discount: r,
    beta,
    m_low:  parseFloat(params.m_low),
    m_high: parseFloat(params.m_high),
    c_low,
    c_high,
    submitted_at: new Date(),
  };
}

// ── Full Stage 2 computation (agent completes checklist) ─
function computeStage2(device, agentScores, M_actual, r_recycler) {
  const q_agent = computeQAgent(agentScores);
  const q_final = computeQFinal(
    parseFloat(device.q_remote) || 0,
    q_agent
  );

  const c_final = computeCFinal({
    omv_kes: device.omv_kes || 0,
    D:       parseFloat(device.D)    || 0,
    Q_final: q_final,
    M:       M_actual,
    beta:    parseFloat(device.beta) || 0,
    c_min:   parseFloat(device.c_low) <= 200 ? 200 : 200,
  });

  const platform_margin = r_recycler ? computeMargin(r_recycler, c_final) : null;

  return {
    q_function: agentScores.q_function,
    q_battery:  agentScores.q_battery,
    q_camera:   agentScores.q_camera,
    q_touch:    agentScores.q_touch,
    q_speaker:  agentScores.q_speaker,
    q_agent:    parseFloat(q_agent.toFixed(3)),
    q_final:    parseFloat(q_final.toFixed(3)),
    m_actual:   M_actual,
    c_final,
    r_recycler:      r_recycler || null,
    platform_margin: platform_margin,
  };
}

module.exports = {
  computeDepreciation,
  computeQRemote,
  computeQAgent,
  computeQFinal,
  computeBeta,
  computeHoardingScore,
  computeProximityScore,
  computeStage1Range,
  computeCFinal,
  computeMargin,
  computeStage1,
  computeStage2,
};