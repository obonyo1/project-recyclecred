import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentAuthService, agentDeviceService } from '../services/apiClient';

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 });

const STATUS_MAP = {
  pending_agent: { label:'Pending Review', bg:'#FFF8E1', color:'#7D5A00' },
  agent_review:  { label:'In Review',      bg:'#E3F2FD', color:'#0D47A1' },
  offer_sent:    { label:'Offer Sent',     bg:'#E8EAF6', color:'#283593' },
  accepted:      { label:'Accepted',       bg:'#E0F7FA', color:'#006064' },
  dropped_off:   { label:'Dropped Off',    bg:'#E8F5E9', color:'#1B5E20' },
  recycled:      { label:'Recycled ✓',     bg:'#E8F5EE', color:'#1A6B3C' },
  rejected:      { label:'Rejected',       bg:'#FFEBEE', color:'#C62828' },
};
const Badge = ({ status }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.pending_agent;
  return <span style={{ background:s.bg, color:s.color, borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:600 }}>{s.label}</span>;
};

const NAV = [
  { id:'lookup', label:'Scan Code',      icon:'🔍' },
  { id:'queue',  label:'Device Queue',   icon:'📋' },
  { id:'assess', label:'Assessment',     icon:'📝' },
  { id:'stats',  label:'My Stats',       icon:'📊' },
];

const card = { background:'#fff', borderRadius:12, border:'1px solid #E4EDE7' };
const btnGreen = { background:'#0D3B26', color:'#fff', border:'none', borderRadius:8, padding:'13px 24px', fontSize:14, fontWeight:600, cursor:'pointer' };

// ══════════════════════════════════════════════════════════
// LOOKUP TAB — agent enters the code the customer shows
// ══════════════════════════════════════════════════════════
function LookupTab({ onDeviceFound }) {
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true); setError('');

    const { data, error: err } = await agentDeviceService.lookupByCode(code.trim());
    setLoading(false);

    if (err) { setError(err); return; }
    onDeviceFound(data.device);
  };

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'#0D3B26' }}>Customer Code Lookup</h1>
        <p style={{ margin:'4px 0 0', color:'#6B7B6E', fontSize:14 }}>
          Ask the customer for their handoff code (e.g. RC-A3F7) and enter it below.
        </p>
      </div>

      <div style={{ ...card, maxWidth:480, padding:32 }}>
        <form onSubmit={handleLookup}>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#0D3B26', marginBottom:8 }}>
              Customer Handoff Code
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="RC-XXXX"
              maxLength={7}
              style={{
                width:'100%', padding:'14px 16px', border:'2px solid #E4EDE7',
                borderRadius:10, fontSize:24, fontWeight:700, fontFamily:'monospace',
                letterSpacing:'0.15em', textAlign:'center', boxSizing:'border-box',
                color:'#0D3B26', textTransform:'uppercase',
              }}
            />
          </div>

          {error && (
            <div style={{ background:'#FFEBEE', border:'1px solid #FFCDD2', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#C62828', marginBottom:16 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !code.trim()} style={{ ...btnGreen, width:'100%', opacity: code.trim() ? 1 : 0.5 }}>
            {loading ? 'Looking up...' : 'Look Up Device →'}
          </button>
        </form>

        <div style={{ marginTop:20, padding:'14px', background:'#F7FAF8', borderRadius:8, fontSize:13, color:'#6B7B6E', lineHeight:1.6 }}>
          <strong style={{ color:'#0D3B26' }}>How it works:</strong><br/>
          1. Customer submits their device online and gets a unique code<br/>
          2. They bring the device to your station and show you the code<br/>
          3. Enter the code above to pull up their Stage 1 estimate<br/>
          4. Complete the physical checklist to set the final price (C_final)<br/>
          5. Confirm recycled — payment goes to their M-Pesa instantly
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// QUEUE TAB
// ══════════════════════════════════════════════════════════
function QueueTab({ devices, onSelect }) {
  const queue = devices.filter(d => ['pending_agent','agent_review','accepted','dropped_off'].includes(d.status));
  const done  = devices.filter(d => ['recycled','rejected','offer_sent'].includes(d.status));

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'#0D3B26' }}>Device Queue</h1>
        <p style={{ margin:'4px 0 0', color:'#6B7B6E', fontSize:14 }}>
          {queue.length} device{queue.length!==1?'s':''} awaiting assessment at your station
        </p>
      </div>

      {queue.length > 0 ? (
        <div style={{ ...card, marginBottom:24 }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #E4EDE7', fontWeight:700, color:'#0D3B26', fontSize:14 }}>
            🔔 Pending Assessment ({queue.length})
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F7FAF8' }}>
                {['Code','Device','Customer','Stage 1 Range (KES)','Submitted','Status',''].map(h => (
                  <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:11, color:'#8A9E8E', textTransform:'uppercase', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queue.map(d => (
                <tr key={d.id} style={{ borderTop:'1px solid #EEF3EF', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background='#F7FAF8'}
                  onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:14, color:'#1A6B3C', letterSpacing:'0.05em', background:'#E8F5EE', padding:'4px 8px', borderRadius:6 }}>
                      {d.handoff_code || '—'}
                    </span>
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:13, fontWeight:600, color:'#0D3B26' }}>{d.name || `${d.make} ${d.model}`}</td>
                  <td style={{ padding:'12px 14px', fontSize:13 }}>{d.user_name || '—'}</td>
                  <td style={{ padding:'12px 14px', fontSize:13 }}>{d.c_low ? `${fmt(d.c_low)} – ${fmt(d.c_high)}` : '—'}</td>
                  <td style={{ padding:'12px 14px', fontSize:12, color:'#8A9E8E' }}>{d.submitted_at ? new Date(d.submitted_at).toLocaleDateString('en-KE') : '—'}</td>
                  <td style={{ padding:'12px 14px' }}><Badge status={d.status} /></td>
                  <td style={{ padding:'12px 14px' }}>
                    <button onClick={() => onSelect(d)} style={{ ...btnGreen, padding:'7px 14px', fontSize:12 }}>
                      Assess →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ ...card, padding:40, textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
          <p style={{ color:'#6B7B6E', margin:0 }}>No devices pending. Use "Scan Code" when a customer arrives.</p>
        </div>
      )}

      {done.length > 0 && (
        <div style={card}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #E4EDE7', fontWeight:700, color:'#0D3B26', fontSize:14 }}>
            Completed ({done.length})
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F7FAF8' }}>
                {['Device','Customer','C Final (KES)','Margin (KES)','Status'].map(h => (
                  <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:11, color:'#8A9E8E', textTransform:'uppercase', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {done.map(d => (
                <tr key={d.id} style={{ borderTop:'1px solid #EEF3EF' }}>
                  <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600 }}>{d.name || `${d.make} ${d.model}`}</td>
                  <td style={{ padding:'10px 14px', fontSize:13 }}>{d.user_name || '—'}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600, color:'#1A6B3C' }}>{d.c_final ? fmt(d.c_final) : '—'}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, color: parseFloat(d.platform_margin) >= 0 ? '#1A6B3C' : '#C62828' }}>
                    {d.platform_margin != null ? fmt(d.platform_margin) : '—'}
                  </td>
                  <td style={{ padding:'10px 14px' }}><Badge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ASSESSMENT TAB
// ══════════════════════════════════════════════════════════
function AssessTab({ selectedDevice, onDone }) {
  const [scores,    setScores]    = useState({ q_function:0.7, q_battery:0.7, q_camera:0.7, q_touch:0.7, q_speaker:0.7 });
  const [mActual,   setMActual]   = useState('1.10');
  const [rRecycler, setRRecycler] = useState('');
  const [imeiMatch, setImeiMatch] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState('');

  const d = selectedDevice;

  if (!d) return (
    <div>
      <div style={{ marginBottom:24 }}><h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'#0D3B26' }}>Assessment</h1></div>
      <div style={{ ...card, padding:40, textAlign:'center' }}>
        <div style={{ fontSize:36, marginBottom:12 }}>🔍</div>
        <p style={{ color:'#6B7B6E' }}>Use "Scan Code" to look up a customer's device, or select one from the Queue.</p>
      </div>
    </div>
  );

  const ScoreSlider = ({ field, label, weight }) => (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <label style={{ fontSize:13, fontWeight:600, color:'#0D3B26' }}>{label} <span style={{ color:'#8A9E8E', fontWeight:400 }}>({weight})</span></label>
        <span style={{ fontSize:15, fontWeight:700, color:'#1A6B3C' }}>{scores[field].toFixed(2)}</span>
      </div>
      <input type="range" min="0.3" max="1.0" step="0.05"
        value={scores[field]}
        onChange={e => setScores(p => ({ ...p, [field]: parseFloat(e.target.value) }))}
        style={{ width:'100%', accentColor:'#1A6B3C' }}
      />
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#aaa', marginTop:2 }}>
        <span>0.3 Poor</span><span>0.65 Fair</span><span>1.0 Excellent</span>
      </div>
    </div>
  );

  const handleSubmit = async () => {
    if (imeiMatch === null) { setError('Please confirm IMEI match status.'); return; }
    if (!mActual)           { setError('Market multiplier M is required.'); return; }
    setLoading(true); setError('');
    const { data, error: err } = await agentDeviceService.assess(d.id, {
      ...scores,
      m_actual:   parseFloat(mActual),
      r_recycler: rRecycler ? parseFloat(rRecycler) : undefined,
      imei_match: imeiMatch,
    });
    setLoading(false);
    if (err) { setError(err); return; }
    setResult(data);
  };

  const handleConfirmRecycled = async () => {
    setLoading(true);
    const { error: err } = await agentDeviceService.confirmRecycled(d.id);
    setLoading(false);
    if (err) { setError(err); return; }
    onDone();
  };

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'#0D3B26' }}>Stage 2 Assessment</h1>
        <p style={{ margin:'4px 0 0', color:'#6B7B6E', fontSize:14 }}>
          Physical checklist for <strong>{d.name || `${d.make} ${d.model}`}</strong>
          {d.handoff_code && <span style={{ marginLeft:8, fontFamily:'monospace', fontWeight:700, color:'#1A6B3C', background:'#E8F5EE', padding:'2px 8px', borderRadius:5 }}>{d.handoff_code}</span>}
        </p>
      </div>

      {error && <div style={{ background:'#FFEBEE', border:'1px solid #FFCDD2', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#C62828', marginBottom:16 }}>{error}</div>}

      {!result ? (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

          {/* Stage 1 summary */}
          <div style={card}>
            <div style={{ padding:'13px 18px', borderBottom:'1px solid #E4EDE7', fontWeight:700, color:'#0D3B26', fontSize:14 }}>Stage 1 Summary</div>
            <div style={{ padding:'16px 18px' }}>
              {[
                ['Device',             d.name || `${d.make} ${d.model}`],
                ['Customer',           d.user_name || '—'],
                ['Phone',              d.user_phone || '—'],
                ['Handoff Code',       d.handoff_code || '—'],
                ['OMV (KES)',          d.omv_kes ? fmt(d.omv_kes) : '—'],
                ['Age / Useful Life',  d.t ? `${d.t}yr / ${d.n}yr` : '—'],
                ['Depreciation D',     d.D ? parseFloat(d.D).toFixed(3) : '—'],
                ['Q Remote',           d.q_remote ? parseFloat(d.q_remote).toFixed(3) : '—'],
                ['Uplift β',           d.beta ? `KES ${fmt(d.beta)}` : '—'],
                ['Stage 1 Range',      d.c_low ? `KES ${fmt(d.c_low)} – ${fmt(d.c_high)}` : '—'],
                ['Income Factor I',    d.income_factor || '—'],
                ['Proximity P',        d.proximity_score || '—'],
                ['Hoarding H',         d.hoarding_score || '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #EEF3EF', fontSize:13 }}>
                  <span style={{ color:'#6B7B6E' }}>{k}</span>
                  <span style={{ fontWeight:600, color:'#0D3B26' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Physical checklist */}
          <div style={card}>
            <div style={{ padding:'13px 18px', borderBottom:'1px solid #E4EDE7', fontWeight:700, color:'#0D3B26', fontSize:14 }}>Physical Checklist (Stage 2)</div>
            <div style={{ padding:'16px 18px' }}>

              {/* IMEI check */}
              <div style={{ marginBottom:20, padding:14, background:'#FFF8E1', border:'1px solid #FFE082', borderRadius:8 }}>
                <div style={{ fontWeight:600, fontSize:13, color:'#0D3B26', marginBottom:8 }}>🔍 IMEI Verification</div>
                {d.imei && <div style={{ fontSize:12, color:'#6B7B6E', marginBottom:8 }}>Submitted IMEI: <strong>{d.imei}</strong></div>}
                <div style={{ display:'flex', gap:10 }}>
                  {[
                    { v:true,  label:'✅ IMEI Matches', bg:'#E8F5EE', border:'#A5D6A7', color:'#1A6B3C' },
                    { v:false, label:'❌ Mismatch — Block', bg:'#FFEBEE', border:'#FFCDD2', color:'#C62828' },
                  ].map(opt => (
                    <label key={String(opt.v)} style={{ flex:1, cursor:'pointer', background: imeiMatch===opt.v ? opt.bg : '#fff', border:`2px solid ${imeiMatch===opt.v ? opt.border : '#E4EDE7'}`, borderRadius:8, padding:'10px', textAlign:'center', fontSize:12, fontWeight:600, color: imeiMatch===opt.v ? opt.color : '#6B7B6E' }}>
                      <input type="radio" style={{ display:'none' }} checked={imeiMatch===opt.v} onChange={() => setImeiMatch(opt.v)} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <ScoreSlider field="q_function" label="Functionality"  weight="35%" />
              <ScoreSlider field="q_battery"  label="Battery Health" weight="25%" />
              <ScoreSlider field="q_camera"   label="Camera"         weight="15%" />
              <ScoreSlider field="q_touch"    label="Touchscreen"    weight="15%" />
              <ScoreSlider field="q_speaker"  label="Speaker / Mic"  weight="10%" />

              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#0D3B26', marginBottom:6 }}>
                  Market Multiplier M <span style={{ color:'#8A9E8E', fontWeight:400 }}>(range: {d.m_low}–{d.m_high})</span>
                </label>
                <input type="number" step="0.01" min={d.m_low} max={d.m_high} value={mActual}
                  onChange={e => setMActual(e.target.value)}
                  style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #E4EDE7', borderRadius:8, fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }} />
              </div>

              <div style={{ marginBottom:20 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#0D3B26', marginBottom:6 }}>
                  Recycler Recovery Value R (KES) <span style={{ color:'#8A9E8E', fontWeight:400 }}>— optional</span>
                </label>
                <input type="number" min="0" value={rRecycler} onChange={e => setRRecycler(e.target.value)}
                  placeholder="e.g. 5000 — used to compute platform margin π"
                  style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #E4EDE7', borderRadius:8, fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }} />
              </div>

              <button onClick={handleSubmit} disabled={loading}
                style={{ ...btnGreen, width:'100%' }}>
                {loading ? 'Computing C_final...' : 'Submit Assessment →'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Result */
        <div style={{ ...card, padding:28 }}>
          <div style={{ textAlign:'center', marginBottom:24, paddingBottom:20, borderBottom:'1px solid #E4EDE7' }}>
            <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
            <h2 style={{ margin:0, color:'#0D3B26' }}>Assessment Complete</h2>
            <p style={{ margin:'6px 0 0', color:'#6B7B6E', fontSize:14 }}>Final price set for {d.name || `${d.make} ${d.model}`}</p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
            {[
              { label:'Q Agent',         value: result.summary?.q_agent?.toFixed(3), color:'#1A6B3C' },
              { label:'Q Final',         value: result.summary?.q_final?.toFixed(3), color:'#0D3B26' },
              { label:'C Final (KES)',   value: result.summary?.c_final ? fmt(result.summary.c_final) : '—', color:'#1A6B3C', big:true },
            ].map(s => (
              <div key={s.label} style={{ background:'#F7FAF8', borderRadius:10, padding:16, textAlign:'center' }}>
                <div style={{ fontSize:11, color:'#8A9E8E', marginBottom:6, textTransform:'uppercase' }}>{s.label}</div>
                <div style={{ fontSize: s.big ? 28 : 20, fontWeight:700, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {result.summary?.platform_margin != null && (
            <div style={{ background: result.summary.platform_margin >= 0 ? '#E8F5EE' : '#FFEBEE', border:`1px solid ${result.summary.platform_margin >= 0 ? '#A5D6A7' : '#FFCDD2'}`, borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, fontWeight:600, color: result.summary.platform_margin >= 0 ? '#1A6B3C' : '#C62828' }}>
              Platform Margin π = KES {fmt(result.summary.platform_margin)}
              {result.summary.platform_margin < 0 && ' ⚠️ Negative margin — flagged for review'}
            </div>
          )}

          {!result.summary?.within_range && (
            <div style={{ background:'#FFF3E0', border:'1px solid #FFB74D', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#7D5A00' }}>
              ⚠️ C_final is outside Stage 1 range. Flagged for management review.
            </div>
          )}

          <button onClick={handleConfirmRecycled} disabled={loading}
            style={{ ...btnGreen, width:'100%', fontSize:15, padding:16 }}>
            {loading ? 'Processing...' : '✅ Confirm Recycled — Credit Customer Wallet'}
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// STATS TAB
// ══════════════════════════════════════════════════════════
function StatsTab({ stats }) {
  if (!stats) return <div style={{ padding:40, textAlign:'center', color:'#8A9E8E' }}>Loading...</div>;
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'#0D3B26' }}>My Stats</h1>
        <p style={{ margin:'4px 0 0', color:'#6B7B6E', fontSize:14 }}>Your assessment performance</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        {[
          { label:'Total Assessed',  value: stats.total_assessed,              icon:'📋', color:'#1A6B3C' },
          { label:'Recycled',        value: stats.recycled,                    icon:'✅', color:'#0D4E2B' },
          { label:'Rejected',        value: stats.rejected,                    icon:'❌', color:'#C62828' },
          { label:'Pending',         value: stats.pending,                     icon:'⏳', color:'#7D5A00' },
          { label:'Total Paid Out',  value: `KES ${fmt(stats.total_paid_out)}`, icon:'💸', color:'#1A6B3C' },
          { label:'Total Margin',    value: `KES ${fmt(stats.total_margin)}`,   icon:'📈', color: parseFloat(stats.total_margin) >= 0 ? '#1A6B3C' : '#C62828' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding:20 }}>
            <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:24, fontWeight:700, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12, color:'#8A9E8E', marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN AGENT DASHBOARD
// ══════════════════════════════════════════════════════════
export default function AgentDashboard() {
  const navigate   = useNavigate();
  const [tab,      setTab]      = useState('lookup');
  const [agent,    setAgent]    = useState(null);
  const [devices,  setDevices]  = useState([]);
  const [stats,    setStats]    = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(true);

  const loadData = useCallback(async () => {
    const [devRes, statsRes] = await Promise.all([
      agentDeviceService.list(),
      agentDeviceService.stats(),
    ]);
    if (devRes.data?.devices)  setDevices(devRes.data.devices);
    if (statsRes.data?.stats)  setStats(statsRes.data.stats);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await agentAuthService.getSession();
      if (!mounted) return;
      if (!data?.session?.agent) { navigate('/agent/login'); return; }
      setAgent(data.session.agent);
      await loadData();
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [navigate, loadData]);

  const handleDeviceFound = (device) => {
    setSelected(device);
    setTab('assess');
  };

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#F4F6F3' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>♻️</div>
        <div style={{ width:32, height:32, border:'3px solid #E4EDE7', borderTop:'3px solid #1A6B3C', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }} />
        <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  const pending = devices.filter(d => ['pending_agent','agent_review','accepted','dropped_off'].includes(d.status)).length;

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:"'Inter','Segoe UI',sans-serif", background:'#F4F6F3' }}>

      {/* Sidebar */}
      <aside style={{ width:236, background:'#14532D', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'24px 20px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:32, height:32, background:'#1A6B3C', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>♻️</div>
            <div>
              <div style={{ color:'#fff', fontWeight:700, fontSize:15 }}>RecycleCred</div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.05em' }}>Agent Portal</div>
            </div>
          </div>
        </div>

        <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ color:'#fff', fontWeight:600, fontSize:13 }}>{agent?.full_name || agent?.email}</div>
          <div style={{ color:'rgba(255,255,255,0.45)', fontSize:11, marginTop:2 }}>{agent?.partner || 'Certified Agent'}</div>
          {agent?.station_name && <div style={{ color:'rgba(255,255,255,0.35)', fontSize:11, marginTop:1 }}>📍 {agent.station_name}</div>}
        </div>

        <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:2 }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} style={{
              display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
              borderRadius:8, border:'none', cursor:'pointer', width:'100%', textAlign:'left',
              background: tab===item.id ? '#1A6B3C' : 'transparent',
              color:      tab===item.id ? '#fff' : 'rgba(255,255,255,0.5)',
              fontSize:13, fontWeight: tab===item.id ? 600 : 400,
            }}>
              <span style={{ fontSize:15 }}>{item.icon}</span>
              {item.label}
              {item.id==='queue' && pending > 0 && (
                <span style={{ marginLeft:'auto', background:'#C62828', color:'#fff', borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>
                  {pending}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding:'8px 8px 16px' }}>
          <button onClick={() => { agentAuthService.logout(); navigate('/agent/login'); }} style={{
            display:'flex', alignItems:'center', gap:8, padding:'10px 12px',
            borderRadius:8, border:'none', cursor:'pointer', width:'100%',
            background:'transparent', color:'rgba(255,255,255,0.35)', fontSize:13,
          }}>
            ← Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
        {tab === 'lookup' && <LookupTab onDeviceFound={handleDeviceFound} />}
        {tab === 'queue'  && <QueueTab  devices={devices} onSelect={d => { setSelected(d); setTab('assess'); }} />}
        {tab === 'assess' && <AssessTab selectedDevice={selected} onDone={() => { setSelected(null); setTab('queue'); loadData(); }} />}
        {tab === 'stats'  && <StatsTab  stats={stats} />}
      </main>
    </div>
  );
}