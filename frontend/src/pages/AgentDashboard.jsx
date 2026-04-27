import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentAuthService, agentDeviceService } from '../services/apiClient';

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 });

const STATUS_MAP = {
  pending_agent: { label: 'Pending Review',  bg: '#FFF8E1', color: '#7D5A00' },
  agent_review:  { label: 'In Review',       bg: '#E3F2FD', color: '#0D47A1' },
  offer_sent:    { label: 'Offer Sent',      bg: '#E8EAF6', color: '#283593' },
  accepted:      { label: 'Accepted',        bg: '#E0F7FA', color: '#006064' },
  dropped_off:   { label: 'Dropped Off',     bg: '#E8F5E9', color: '#1B5E20' },
  recycled:      { label: 'Recycled ✓',      bg: '#E8F5EE', color: '#1A6B3C' },
  rejected:      { label: 'Rejected',        bg: '#FFEBEE', color: '#C62828' },
};
const Badge = ({ status }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.pending_agent;
  return <span style={{ background:s.bg, color:s.color, borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:600 }}>{s.label}</span>;
};

const NAV = [
  { id:'queue',    label:'Device Queue',  icon:'📋' },
  { id:'assess',   label:'Assessment',    icon:'🔍' },
  { id:'stats',    label:'My Stats',      icon:'📊' },
];

const card = { background:'#fff', borderRadius:12, border:'1px solid #E4EDE7' };

// ══════════════════════════════════════════════════════════
// QUEUE TAB — list of devices awaiting assessment
// ══════════════════════════════════════════════════════════
function QueueTab({ devices, onSelect }) {
  const queue = devices.filter(d => ['pending_agent','agent_review','accepted','dropped_off'].includes(d.status));
  const done  = devices.filter(d => ['recycled','rejected','offer_sent'].includes(d.status));

  const DeviceRow = ({ d }) => (
    <tr style={{ borderTop:'1px solid #EEF3EF', cursor:'pointer' }} onClick={() => onSelect(d)}
      onMouseEnter={e => e.currentTarget.style.background='#F7FAF8'}
      onMouseLeave={e => e.currentTarget.style.background='#fff'}>
      <td style={{ padding:'12px 14px', fontSize:13, fontWeight:600, color:'#0D3B26' }}>{d.name || `${d.make} ${d.model}`}</td>
      <td style={{ padding:'12px 14px', fontSize:13 }}>{d.user_name || '—'}</td>
      <td style={{ padding:'12px 14px', fontSize:13 }}>{d.user_phone || '—'}</td>
      <td style={{ padding:'12px 14px', fontSize:12, color:'#6B7B6E' }}>{d.c_low ? `KES ${fmt(d.c_low)}–${fmt(d.c_high)}` : '—'}</td>
      <td style={{ padding:'12px 14px', fontSize:12, color:'#8A9E8E' }}>{d.submitted_at ? new Date(d.submitted_at).toLocaleDateString('en-KE') : '—'}</td>
      <td style={{ padding:'12px 14px' }}><Badge status={d.status} /></td>
      <td style={{ padding:'12px 14px' }}>
        {['pending_agent','agent_review','accepted','dropped_off'].includes(d.status) && (
          <button onClick={e => { e.stopPropagation(); onSelect(d); }} style={{ background:'#0D3B26', color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            Assess →
          </button>
        )}
      </td>
    </tr>
  );

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'#0D3B26' }}>Device Queue</h1>
        <p style={{ margin:'4px 0 0', color:'#6B7B6E', fontSize:14 }}>
          {queue.length} device{queue.length!==1?'s':''} awaiting physical assessment
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
                {['Device','Customer','Phone','Stage 1 Range','Submitted','Status','Action'].map(h => (
                  <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:11, color:'#8A9E8E', textTransform:'uppercase', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{queue.map(d => <DeviceRow key={d.id} d={d} />)}</tbody>
          </table>
        </div>
      ) : (
        <div style={{ ...card, padding:40, textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
          <p style={{ color:'#6B7B6E', margin:0 }}>No devices pending. Queue is clear.</p>
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
                  <td style={{ padding:'10px 14px', fontSize:13, color: d.platform_margin >= 0 ? '#1A6B3C' : '#C62828' }}>
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
// ASSESSMENT TAB — agent enters Stage 2 checklist
// ══════════════════════════════════════════════════════════
function AssessTab({ selectedDevice, onDone }) {
  const [scores, setScores] = useState({ q_function:0, q_battery:0, q_camera:0, q_touch:0, q_speaker:0 });
  const [mActual,    setMActual]    = useState('1.10');
  const [rRecycler,  setRRecycler]  = useState('');
  const [imeiMatch,  setImeiMatch]  = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState('');

  const d = selectedDevice;

  if (!d) return (
    <div>
      <div style={{ marginBottom:24 }}><h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'#0D3B26' }}>Assessment</h1></div>
      <div style={{ ...card, padding:40, textAlign:'center' }}>
        <div style={{ fontSize:36, marginBottom:12 }}>🔍</div>
        <p style={{ color:'#6B7B6E' }}>Select a device from the Queue tab to start assessment.</p>
      </div>
    </div>
  );

  const ScoreSlider = ({ field, label }) => (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <label style={{ fontSize:13, fontWeight:600, color:'#0D3B26' }}>{label}</label>
        <span style={{ fontSize:14, fontWeight:700, color:'#1A6B3C' }}>{scores[field].toFixed(2)}</span>
      </div>
      <input type="range" min="0.3" max="1.0" step="0.05"
        value={scores[field]}
        onChange={e => setScores(prev => ({ ...prev, [field]: parseFloat(e.target.value) }))}
        style={{ width:'100%', accentColor:'#1A6B3C' }}
      />
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#8A9E8E', marginTop:2 }}>
        <span>0.3 Poor</span><span>0.65 Fair</span><span>1.0 Excellent</span>
      </div>
    </div>
  );

  const handleSubmit = async () => {
    if (imeiMatch === null) { setError('Please confirm IMEI match status.'); return; }
    if (!mActual)           { setError('M actual (recycler multiplier) is required.'); return; }
    setLoading(true); setError('');

    const { data, error: err } = await agentDeviceService.assess(d.id, {
      ...scores,
      m_actual:    parseFloat(mActual),
      r_recycler:  rRecycler ? parseFloat(rRecycler) : undefined,
      imei_match:  imeiMatch,
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
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'#0D3B26' }}>Stage 2 Assessment</h1>
        <p style={{ margin:'4px 0 0', color:'#6B7B6E', fontSize:14 }}>
          Physical checklist for <strong>{d.name || `${d.make} ${d.model}`}</strong> — Customer: {d.user_name}
        </p>
      </div>

      {error && <div style={{ background:'#FFEBEE', border:'1px solid #FFCDD2', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#C62828', marginBottom:16 }}>{error}</div>}

      {!result ? (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

          {/* Left: Stage 1 summary */}
          <div style={card}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid #E4EDE7', fontWeight:700, color:'#0D3B26', fontSize:14 }}>Stage 1 Summary</div>
            <div style={{ padding:'16px 18px' }}>
              {[
                ['Device',          d.name || `${d.make} ${d.model}`],
                ['OMV',             d.omv_kes ? `KES ${fmt(d.omv_kes)}` : '—'],
                ['Device Age (t)',  d.t ? `${d.t} years` : '—'],
                ['Depreciation (D)', d.D ? parseFloat(d.D).toFixed(3) : '—'],
                ['Q Remote',        d.q_remote ? parseFloat(d.q_remote).toFixed(3) : '—'],
                ['Uplift β',        d.beta ? `KES ${fmt(d.beta)}` : '—'],
                ['Stage 1 Range',   d.c_low ? `KES ${fmt(d.c_low)} – ${fmt(d.c_high)}` : '—'],
                ['Customer',        d.user_name || '—'],
                ['Phone',           d.user_phone || '—'],
                ['Income Factor I', d.income_factor || '—'],
                ['Awareness A',     d.awareness_score || '—'],
                ['Hoarding H',      d.hoarding_score || '—'],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #EEF3EF', fontSize:13 }}>
                  <span style={{ color:'#6B7B6E' }}>{k}</span>
                  <span style={{ fontWeight:600, color:'#0D3B26' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Checklist */}
          <div style={card}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid #E4EDE7', fontWeight:700, color:'#0D3B26', fontSize:14 }}>Physical Checklist (Stage 2)</div>
            <div style={{ padding:'16px 18px' }}>

              {/* IMEI verification */}
              <div style={{ marginBottom:20, padding:'14px', background:'#FFF8E1', border:'1px solid #FFE082', borderRadius:8 }}>
                <div style={{ fontWeight:600, fontSize:13, color:'#0D3B26', marginBottom:10 }}>
                  🔍 IMEI Verification (IMEI_match)
                </div>
                {d.imei && <div style={{ fontSize:12, color:'#6B7B6E', marginBottom:8 }}>Submitted IMEI: <strong>{d.imei}</strong></div>}
                <div style={{ display:'flex', gap:10 }}>
                  {[{v:true, label:'✅ IMEI Matches', bg:'#E8F5EE', border:'#A5D6A7', color:'#1A6B3C'},
                    {v:false, label:'❌ IMEI Mismatch', bg:'#FFEBEE', border:'#FFCDD2', color:'#C62828'}].map(opt => (
                    <label key={String(opt.v)} style={{ flex:1, cursor:'pointer', background: imeiMatch===opt.v?opt.bg:'#fff', border:`2px solid ${imeiMatch===opt.v?opt.border:'#E4EDE7'}`, borderRadius:8, padding:'10px', textAlign:'center', fontSize:13, fontWeight:600, color: imeiMatch===opt.v?opt.color:'#6B7B6E' }}>
                      <input type="radio" style={{ display:'none' }} onChange={() => setImeiMatch(opt.v)} checked={imeiMatch===opt.v} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Quality scores */}
              <ScoreSlider field="q_function" label="Functionality (q_function) — weight 35%" />
              <ScoreSlider field="q_battery"  label="Battery Health (q_battery) — weight 25%" />
              <ScoreSlider field="q_camera"   label="Camera (q_camera) — weight 15%" />
              <ScoreSlider field="q_touch"    label="Touchscreen (q_touch) — weight 15%" />
              <ScoreSlider field="q_speaker"  label="Speaker/Mic (q_speaker) — weight 10%" />

              {/* Market multiplier */}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#0D3B26', marginBottom:6 }}>
                  Market Multiplier M_actual
                  <span style={{ fontSize:11, color:'#6B7B6E', fontWeight:400, marginLeft:6 }}>
                    (Stage 1 range: {d.m_low}–{d.m_high})
                  </span>
                </label>
                <input type="number" step="0.01" min={d.m_low} max={d.m_high} value={mActual}
                  onChange={e => setMActual(e.target.value)}
                  style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #E4EDE7', borderRadius:8, fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }} />
              </div>

              {/* Recycler recovery value */}
              <div style={{ marginBottom:20 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#0D3B26', marginBottom:6 }}>
                  Recycler Recovery Value R (KES) — optional
                </label>
                <input type="number" min="0" value={rRecycler} onChange={e => setRRecycler(e.target.value)}
                  placeholder="e.g. 5000 — used to compute platform margin π"
                  style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #E4EDE7', borderRadius:8, fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }} />
              </div>

              <button onClick={handleSubmit} disabled={loading}
                style={{ width:'100%', background:'#0D3B26', color:'#fff', border:'none', borderRadius:8, padding:'14px', fontSize:14, fontWeight:600, cursor:'pointer' }}>
                {loading ? 'Computing...' : 'Compute C_final & Submit Assessment'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Result card */
        <div style={{ ...card, padding:28 }}>
          <div style={{ textAlign:'center', marginBottom:28, paddingBottom:20, borderBottom:'1px solid #E4EDE7' }}>
            <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
            <h2 style={{ margin:0, color:'#0D3B26' }}>Assessment Complete</h2>
            <p style={{ margin:'6px 0 0', color:'#6B7B6E', fontSize:14 }}>Final price computed for {d.name || `${d.make} ${d.model}`}</p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
            {[
              { label:'Q Agent', value: result.summary?.q_agent?.toFixed(3) || '—', color:'#1A6B3C' },
              { label:'Q Final (blended)', value: result.summary?.q_final?.toFixed(3) || '—', color:'#0D3B26' },
              { label:'C Final (KES)', value: result.summary?.c_final ? fmt(result.summary.c_final) : '—', color:'#1A6B3C', big:true },
            ].map(s => (
              <div key={s.label} style={{ background:'#F7FAF8', borderRadius:10, padding:'16px', textAlign:'center' }}>
                <div style={{ fontSize:12, color:'#8A9E8E', marginBottom:6, textTransform:'uppercase' }}>{s.label}</div>
                <div style={{ fontSize: s.big ? 28 : 22, fontWeight:700, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {result.summary?.platform_margin != null && (
            <div style={{ background: result.summary.platform_margin >= 0 ? '#E8F5EE' : '#FFEBEE', border:`1px solid ${result.summary.platform_margin >= 0 ? '#A5D6A7' : '#FFCDD2'}`, borderRadius:8, padding:'12px 16px', marginBottom:20, fontSize:13, color: result.summary.platform_margin >= 0 ? '#1A6B3C' : '#C62828', fontWeight:600 }}>
              Platform Margin π = KES {fmt(result.summary.platform_margin)}
              {result.summary.platform_margin < 0 && ' ⚠️ Negative margin — flagged for review'}
            </div>
          )}

          {!result.summary?.within_range && (
            <div style={{ background:'#FFF3E0', border:'1px solid #FFB74D', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#7D5A00' }}>
              ⚠️ C_final is outside the Stage 1 range. This has been flagged for management review.
            </div>
          )}

          <div style={{ display:'flex', gap:12 }}>
            <button onClick={handleConfirmRecycled} disabled={loading}
              style={{ flex:1, background:'#0D3B26', color:'#fff', border:'none', borderRadius:8, padding:'14px', fontSize:14, fontWeight:600, cursor:'pointer' }}>
              {loading ? 'Processing...' : '✅ Confirm Recycled — Credit User Wallet'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// STATS TAB
// ══════════════════════════════════════════════════════════
function StatsTab({ stats }) {
  if (!stats) return <div style={{ padding:40, textAlign:'center', color:'#8A9E8E' }}>Loading stats...</div>;
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'#0D3B26' }}>My Stats</h1>
        <p style={{ margin:'4px 0 0', color:'#6B7B6E', fontSize:14 }}>Your assessment performance</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Assessed',  value: stats.total_assessed,            color:'#1A6B3C', icon:'📋' },
          { label:'Recycled',        value: stats.recycled,                  color:'#0D4E2B', icon:'✅' },
          { label:'Rejected',        value: stats.rejected,                  color:'#C62828', icon:'❌' },
          { label:'Pending',         value: stats.pending,                   color:'#7D5A00', icon:'⏳' },
          { label:'Total Paid Out',  value:`KES ${fmt(stats.total_paid_out)}`, color:'#1A6B3C', icon:'💸' },
          { label:'Total Margin',    value:`KES ${fmt(stats.total_margin)}`,   color: stats.total_margin >= 0 ? '#1A6B3C' : '#C62828', icon:'📈' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding:'20px' }}>
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
// MAIN AGENT DASHBOARD SHELL
// ══════════════════════════════════════════════════════════
export default function AgentDashboard() {
  const navigate  = useNavigate();
  const [tab,     setTab]     = useState('queue');
  const [agent,   setAgent]   = useState(null);
  const [devices, setDevices] = useState([]);
  const [stats,   setStats]   = useState(null);
  const [selected,setSelected]= useState(null);
  const [loading, setLoading] = useState(true);

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
              color: tab===item.id ? '#fff' : 'rgba(255,255,255,0.5)',
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
        {tab === 'queue'  && <QueueTab  devices={devices} onSelect={d => { setSelected(d); setTab('assess'); }} />}
        {tab === 'assess' && <AssessTab selectedDevice={selected} onDone={() => { setSelected(null); setTab('queue'); loadData(); }} />}
        {tab === 'stats'  && <StatsTab  stats={stats} />}
      </main>
    </div>
  );
}