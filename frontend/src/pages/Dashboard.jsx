import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, deviceService, walletService, stationService } from '../services/apiClient';
import './Dashboard.css';

// ── helpers ───────────────────────────────────────────────
const fmt  = (n) => parseFloat(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 });
const initials = (name) => {
  if (!name) return 'U';
  const p = name.trim().split(' ');
  return (p[0][0] + (p[1]?.[0] || '')).toUpperCase();
};
const STATUS_MAP = {
  draft:         { label: 'Draft',           bg: '#F5F5F5', color: '#616161' },
  pending_agent: { label: 'Pending Agent',   bg: '#FFF8E1', color: '#7D5A00' },
  agent_review:  { label: 'Agent Review',    bg: '#E3F2FD', color: '#0D47A1' },
  offer_sent:    { label: 'Offer Ready',     bg: '#E8EAF6', color: '#283593' },
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
  { id:'home',     label:'Dashboard',          icon:'⊞' },
  { id:'scan',     label:'Scan Device',         icon:'📱' },
  { id:'devices',  label:'My Devices',          icon:'📋' },
  { id:'wallet',   label:'Wallet',              icon:'💰' },
  { id:'stations', label:'Collection Points',   icon:'📍' },
];

// ── shared card style ─────────────────────────────────────
const card = { background:'#fff', borderRadius:12, border:'1px solid #E4EDE7' };

// ══════════════════════════════════════════════════════════
// HOME TAB
// ══════════════════════════════════════════════════════════
function HomeTab({ user, devices, wallet }) {
  const recycled  = devices.filter(d => d.status === 'recycled').length;
  const pending   = devices.filter(d => !['recycled','rejected'].includes(d.status)).length;
  const eWaste    = devices.reduce((s,d) => s + parseFloat(d.weight_kg||0), 0).toFixed(1);
  const recent    = devices.slice(0, 5);

  const incomeLabels = { low:'Low Income', medium:'Middle Income', high:'High Income' };

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'#0D3B26' }}>
          Welcome back, {user?.full_name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p style={{ margin:'4px 0 0', color:'#6B7B6E', fontSize:14 }}>Here's your recycling activity</p>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Total Devices',  value:devices.length, icon:'📱', color:'#1A6B3C' },
          { label:'Recycled',       value:recycled,        icon:'✅', color:'#0D4E2B' },
          { label:'In Progress',    value:pending,         icon:'⏳', color:'#7D5A00' },
          { label:'E-Waste Saved',  value:`${eWaste}kg`,   icon:'🌍', color:'#145A32' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding:'16px 20px' }}>
            <div style={{ fontSize:20, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12, color:'#8A9E8E', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Wallet + profile cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
        <div style={{ background:'linear-gradient(135deg,#0D3B26,#1A6B3C)', borderRadius:12, padding:'20px 24px', color:'#fff' }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.55)', marginBottom:6 }}>WALLET BALANCE</div>
          <div style={{ fontSize:32, fontWeight:700 }}>KES {fmt(wallet?.balance)}</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginTop:4 }}>From {recycled} recycled device{recycled!==1?'s':''}</div>
        </div>
        <div style={{ ...card, padding:'20px 24px' }}>
          <div style={{ fontSize:12, color:'#8A9E8E', marginBottom:6 }}>YOUR PROFILE</div>
          <div style={{ fontSize:14, fontWeight:600, color:'#0D3B26' }}>{incomeLabels[user?.income_level] || 'Medium Income'}</div>
          <div style={{ fontSize:12, color:'#6B7B6E', marginTop:4 }}>Income factor I = {user?.income_factor || 0.5}</div>
          <div style={{ fontSize:12, color:'#6B7B6E', marginTop:2 }}>Awareness score A = {parseFloat(user?.awareness_score||0).toFixed(2)}</div>
          <div style={{ fontSize:11, color:'#A5D6A7', marginTop:6, fontWeight:600 }}>
            {parseFloat(user?.awareness_score||0) >= 1 ? '⭐ Repeat user — max uplift' :
             parseFloat(user?.awareness_score||0) >= 0.5 ? '🔄 Active user' : '🆕 New user'}
          </div>
        </div>
      </div>

      {/* Recent devices */}
      <div style={card}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #E4EDE7', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontWeight:700, color:'#0D3B26', fontSize:14 }}>Recent Devices</span>
        </div>
        {recent.length > 0 ? (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F7FAF8' }}>
                {['Device','Offer Range (KES)','Final (KES)','Date','Status'].map(h => (
                  <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontSize:11, color:'#8A9E8E', textTransform:'uppercase', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map(d => (
                <tr key={d.id} style={{ borderTop:'1px solid #EEF3EF' }}>
                  <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:'#0D3B26' }}>{d.name || `${d.make} ${d.model}`}</td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'#6B7B6E' }}>
                    {d.c_low ? `${fmt(d.c_low)} – ${fmt(d.c_high)}` : '—'}
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:'#1A6B3C' }}>
                    {d.c_final ? `KES ${fmt(d.c_final)}` : '—'}
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'#8A9E8E' }}>
                    {d.created_at ? new Date(d.created_at).toLocaleDateString('en-KE') : '—'}
                  </td>
                  <td style={{ padding:'12px 16px' }}><Badge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding:'32px', textAlign:'center', color:'#8A9E8E', fontSize:14 }}>
            No devices yet. Use "Scan Device" to submit your first device.
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// SCAN TAB
// ══════════════════════════════════════════════════════════
function ScanTab({ user, onRefresh }) {
  const [stage, setStage]       = useState('search');   // search | photos | submitting | offer | accepted
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [photos, setPhotos]     = useState({ front:null, back:null, left:null, right:null, imei:null });
  const [photoIdx, setPhotoIdx] = useState(0);
  const [offer, setOffer]       = useState(null);
  const [handoff, setHandoff]   = useState(null);
  const [device, setDevice]     = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [collMode, setCollMode] = useState('drop_off');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const sides      = ['front','back','left','right'];
  const sideLabels = ['Front','Back','Left Side','Right Side'];

  const searchCatalogue = async (q) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    const { data } = await deviceService.searchCatalogue(q);
    if (data?.results) setResults(data.results);
  };

  const capturePhoto = (side, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotos(prev => ({ ...prev, [side]: reader.result }));
      if (side !== 'imei' && photoIdx < 3) setPhotoIdx(i => i + 1);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    // Photos are captured locally for the user's reference.
    // In Phase 3 they will be sent to the AI vision API for scoring.
    // For now we submit device metadata + placeholder quality scores only.
    const payload = {
      make:         selected.make,
      model:        selected.model,
      release_year: selected.release_year,
      q_screen: 0.75,  // Phase 3: replace with AI vision score from photo analysis
      q_body:   0.70,
      q_ports:  0.85,
      // photos intentionally excluded — too large for JSON; Phase 3 will use multipart upload
    };

    const { data, error: err } = await deviceService.submit(payload);
    setLoading(false);
    if (err) { setError(err); return; }
    setOffer(data.offer);
    setHandoff(data.handoff);
    setDevice(data.device);
    setStage('offer');
    setShowModal(true);  // show popup immediately
  };

  const handleAccept = async () => {
    setLoading(true);
    const { error: err } = await deviceService.acceptOffer(device.id, { collection_mode: collMode });
    setLoading(false);
    if (err) { setError(err); return; }
    setStage('accepted');
    onRefresh();
  };

  const reset = () => {
    setStage('search'); setQuery(''); setResults([]); setSelected(null);
    setPhotos({ front:null, back:null, left:null, right:null, imei:null });
    setPhotoIdx(0); setOffer(null); setHandoff(null); setDevice(null); setError(''); setShowModal(false);
  };

  const btnGreen   = { background:'#0D3B26', color:'#fff', border:'none', borderRadius:8, padding:'12px 24px', fontSize:14, fontWeight:600, cursor:'pointer' };
  const btnOutline = { background:'#fff', color:'#0D3B26', border:'2px solid #0D3B26', borderRadius:8, padding:'12px 20px', fontSize:14, fontWeight:600, cursor:'pointer' };

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'#0D3B26' }}>Scan a Device</h1>
        <p style={{ margin:'4px 0 0', color:'#6B7B6E', fontSize:14 }}>
          Submit your device to receive your personalised KES credit offer.
          Your income level (I={user?.income_factor}), proximity (P), awareness (A={parseFloat(user?.awareness_score||0).toFixed(2)})
          and hoarding score (H) all contribute to your uplift.
        </p>
      </div>

      {error && <div style={{ background:'#FFEBEE', border:'1px solid #FFCDD2', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#C62828', marginBottom:16 }}>{error}</div>}

      {/* ── Stage: search ── */}
      {stage === 'search' && (
        <div style={card}>
          <div style={{ padding:24 }}>
            <label style={{ display:'block', marginBottom:8, fontWeight:600, fontSize:13, color:'#0D3B26' }}>Search Device Catalogue</label>
            <input
              type="text"
              value={query}
              onChange={e => searchCatalogue(e.target.value)}
              placeholder="Type make or model e.g. Samsung Galaxy A52"
              style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #E4EDE7', borderRadius:8, fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }}
            />
            {results.length > 0 && (
              <div style={{ marginTop:8, border:'1px solid #E4EDE7', borderRadius:8, overflow:'hidden' }}>
                {results.map(r => (
                  <div key={r.id}
                    onClick={() => { setSelected(r); setResults([]); setQuery(`${r.make} ${r.model}`); }}
                    style={{ padding:'12px 16px', cursor:'pointer', borderBottom:'1px solid #EEF3EF', fontSize:13, display:'flex', justifyContent:'space-between', alignItems:'center' }}
                    onMouseEnter={e => e.currentTarget.style.background='#F7FAF8'}
                    onMouseLeave={e => e.currentTarget.style.background='#fff'}
                  >
                    <span style={{ fontWeight:600 }}>{r.make} {r.model}</span>
                    <span style={{ color:'#6B7B6E', fontSize:12 }}>
                      {r.release_year} · OMV KES {fmt(r.omv_kes)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {selected && (
              <div style={{ marginTop:16, background:'#E8F5EE', border:'1px solid #A5D6A7', borderRadius:8, padding:'14px 16px' }}>
                <div style={{ fontWeight:700, color:'#0D3B26', marginBottom:4 }}>Selected: {selected.make} {selected.model}</div>
                <div style={{ fontSize:13, color:'#4a5568', display:'flex', gap:20, flexWrap:'wrap' }}>
                  <span>📅 {selected.release_year}</span>
                  <span>💰 OMV KES {fmt(selected.omv_kes)}</span>
                  <span>⏳ Useful life: {selected.useful_life_years} years</span>
                </div>
              </div>
            )}

            <button
              style={{ ...btnGreen, marginTop:20, width:'100%', opacity: selected ? 1 : 0.5 }}
              disabled={!selected}
              onClick={() => { setStage('photos'); setPhotoIdx(0); }}
            >
              Next: Take Photos →
            </button>
          </div>
        </div>
      )}

      {/* ── Stage: photos ── */}
      {stage === 'photos' && (
        <div style={card}>
          <div style={{ padding:24 }}>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontWeight:700, color:'#0D3B26', marginBottom:8 }}>
                {photoIdx < 4 ? `Photo ${photoIdx + 1} of 4 — ${sideLabels[photoIdx]}` : 'Scan IMEI / Serial Number'}
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {[...sides, 'imei'].map((s,i) => (
                  <div key={s} style={{ flex:1, height:5, borderRadius:3, background: photos[s] ? '#1A6B3C' : '#E4EDE7' }} />
                ))}
              </div>
            </div>

            {photoIdx < 4 ? (
              <>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  {photos[sides[photoIdx]]
                    ? <img src={photos[sides[photoIdx]]} alt={sideLabels[photoIdx]} style={{ maxHeight:200, maxWidth:'100%', borderRadius:8, border:'1px solid #E4EDE7' }} />
                    : <div style={{ height:180, background:'#F7FAF8', borderRadius:12, border:'2px dashed #E4EDE7', display:'flex', alignItems:'center', justifyContent:'center', color:'#8A9E8E', fontSize:13 }}>
                        📷 Position the <strong style={{ margin:'0 4px' }}>{sideLabels[photoIdx]}</strong> of your device
                      </div>
                  }
                </div>
                <input type="file" accept="image/*" capture="environment" id={`photo-${sides[photoIdx]}`} style={{ display:'none' }}
                  onChange={e => capturePhoto(sides[photoIdx], e.target.files[0])} />
                <div style={{ display:'flex', gap:10 }}>
                  <label htmlFor={`photo-${sides[photoIdx]}`} style={{ ...btnGreen, flex:1, textAlign:'center', display:'block', cursor:'pointer' }}>
                    {photos[sides[photoIdx]] ? 'Retake Photo' : 'Take Photo'}
                  </label>
                  {photos[sides[photoIdx]] && photoIdx < 3 && (
                    <button style={{ ...btnGreen, background:'#1A6B3C' }} onClick={() => setPhotoIdx(i => i+1)}>Next →</button>
                  )}
                  {photos[sides[photoIdx]] && photoIdx === 3 && (
                    <button style={{ ...btnGreen, background:'#1A6B3C' }} onClick={() => setPhotoIdx(4)}>Scan IMEI →</button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  {photos.imei
                    ? <img src={photos.imei} alt="IMEI" style={{ maxHeight:160, maxWidth:'100%', borderRadius:8, border:'1px solid #E4EDE7' }} />
                    : <div style={{ height:140, background:'#F7FAF8', borderRadius:12, border:'2px dashed #E4EDE7', display:'flex', alignItems:'center', justifyContent:'center', color:'#8A9E8E', fontSize:13 }}>
                        📷 Photo the IMEI sticker or Settings → About Phone
                      </div>
                  }
                </div>
                <input type="file" accept="image/*" capture="environment" id="photo-imei" style={{ display:'none' }}
                  onChange={e => capturePhoto('imei', e.target.files[0])} />
                <div style={{ display:'flex', gap:10 }}>
                  <label htmlFor="photo-imei" style={{ ...btnGreen, flex:1, textAlign:'center', display:'block', cursor:'pointer' }}>
                    {photos.imei ? 'Retake' : 'Scan IMEI'}
                  </label>
                  <button
                    style={{ ...btnGreen, background:'#1A6B3C', opacity: loading ? 0.7 : 1 }}
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? 'Submitting...' : 'Submit →'}
                  </button>
                </div>
              </>
            )}

            <button onClick={reset} style={{ marginTop:12, background:'transparent', border:'none', color:'#8A9E8E', fontSize:13, cursor:'pointer', display:'block', width:'100%' }}>
              ← Start Over
            </button>
          </div>
        </div>
      )}

      {/* ── HANDOFF CODE POPUP MODAL ── */}
      {showModal && handoff && offer && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, maxWidth:460, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,0.25)', position:'relative' }}>

            {/* Close */}
            <button onClick={() => setShowModal(false)} style={{ position:'absolute', top:16, right:16, background:'#F4F6F3', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:16, color:'#6B7B6E', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>

            {/* Header */}
            <div style={{ textAlign:'center', marginBottom:24 }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🎉</div>
              <h2 style={{ margin:'0 0 6px', color:'#0D3B26', fontSize:20 }}>Your Offer is Ready!</h2>
              <p style={{ margin:0, color:'#6B7B6E', fontSize:13 }}>Based on your personalised pricing profile</p>
            </div>

            {/* Price range */}
            <div style={{ background:'linear-gradient(135deg,#0D3B26,#1A6B3C)', borderRadius:12, padding:'18px 20px', marginBottom:16, textAlign:'center' }}>
              <div style={{ color:'rgba(255,255,255,0.55)', fontSize:11, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Estimated Credit Range</div>
              <div style={{ color:'#fff', fontSize:28, fontWeight:700 }}>KES {fmt(offer.c_low)} – KES {fmt(offer.c_high)}</div>
              <div style={{ color:'rgba(255,255,255,0.45)', fontSize:11, marginTop:4 }}>Includes uplift β = KES {fmt(offer.beta)}</div>
            </div>

            {/* Handoff code — the main thing */}
            <div style={{ background:'#E8F5EE', border:'2px solid #1A6B3C', borderRadius:12, padding:'20px', marginBottom:16, textAlign:'center' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#1A6B3C', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Your Handoff Code</div>
              <div style={{ fontFamily:'monospace', fontSize:36, fontWeight:800, color:'#0D3B26', letterSpacing:'0.15em', marginBottom:8 }}>
                {handoff.code}
              </div>
              <div style={{ fontSize:12, color:'#6B7B6E' }}>Show this code to the agent at the collection point</div>
              <div style={{ fontSize:11, color:'#aaa', marginTop:4 }}>
                ⏱ Valid for 72 hours · expires {new Date(handoff.expires_at).toLocaleDateString('en-KE')}
              </div>
            </div>

            {/* Nearest station */}
            {handoff.station_name && (
              <div style={{ background:'#F7FAF8', border:'1px solid #E4EDE7', borderRadius:10, padding:'14px 16px', marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#0D3B26', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>📍 Your Nearest Collection Point</div>
                <div style={{ fontWeight:600, fontSize:14, color:'#0D3B26' }}>{handoff.station_name}</div>
                {handoff.station_address && <div style={{ fontSize:12, color:'#6B7B6E', marginTop:3 }}>{handoff.station_address}</div>}
                {handoff.station_phone   && <div style={{ fontSize:12, color:'#6B7B6E', marginTop:2 }}>📞 {handoff.station_phone}</div>}
              </div>
            )}

            <div style={{ background:'#FFF8E1', border:'1px solid #FFE082', borderRadius:8, padding:'10px 14px', marginBottom:20, fontSize:12, color:'#5D4037', lineHeight:1.5 }}>
              ℹ️ Final price confirmed after the agent completes a physical check. The exact amount will be within the range shown above.
            </div>

            <button onClick={() => setShowModal(false)} style={{ ...btnGreen, width:'100%', fontSize:15, padding:14 }}>
              Got it — I'll head to the station
            </button>
          </div>
        </div>
      )}

      {/* ── Stage: offer ── */}
      {stage === 'offer' && offer && (
        <div style={card}>
          <div style={{ padding:24 }}>
            <div style={{ textAlign:'center', marginBottom:24, paddingBottom:20, borderBottom:'1px solid #E4EDE7' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🎉</div>
              <h2 style={{ margin:'0 0 6px', color:'#0D3B26' }}>Your Personalised Offer</h2>
              <p style={{ margin:0, color:'#6B7B6E', fontSize:14 }}>Based on your income level, proximity, awareness, and hoarding profile</p>
            </div>

            {/* Price range */}
            <div style={{ background:'linear-gradient(135deg,#0D3B26,#1A6B3C)', borderRadius:12, padding:'20px 24px', marginBottom:16, textAlign:'center' }}>
              <div style={{ color:'rgba(255,255,255,0.6)', fontSize:12, marginBottom:8 }}>ESTIMATED CREDIT RANGE</div>
              <div style={{ color:'#fff', fontSize:32, fontWeight:700 }}>KES {fmt(offer.c_low)} – KES {fmt(offer.c_high)}</div>
              <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12, marginTop:6 }}>Includes uplift β = KES {fmt(offer.beta)}</div>
            </div>

            {/* Handoff code inline */}
            {handoff && (
              <div style={{ background:'#E8F5EE', border:'2px solid #1A6B3C', borderRadius:12, padding:'16px 20px', marginBottom:16, textAlign:'center' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#1A6B3C', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Your Handoff Code</div>
                <div style={{ fontFamily:'monospace', fontSize:32, fontWeight:800, color:'#0D3B26', letterSpacing:'0.15em' }}>{handoff.code}</div>
                <div style={{ fontSize:12, color:'#6B7B6E', marginTop:6 }}>Show this to the agent at <strong>{handoff.station_name}</strong></div>
                <button onClick={() => setShowModal(true)} style={{ marginTop:8, background:'transparent', border:'1px solid #1A6B3C', borderRadius:6, padding:'5px 14px', fontSize:12, color:'#1A6B3C', cursor:'pointer', fontWeight:600 }}>
                  View full details
                </button>
              </div>
            )}

            {handoff?.station_name && (
              <div style={{ background:'#F7FAF8', border:'1px solid #E4EDE7', borderRadius:10, padding:'12px 16px', marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#0D3B26', marginBottom:4 }}>📍 Nearest Collection Point</div>
                <div style={{ fontWeight:600, fontSize:14, color:'#0D3B26' }}>{handoff.station_name}</div>
                {handoff.station_address && <div style={{ fontSize:12, color:'#6B7B6E', marginTop:2 }}>{handoff.station_address}</div>}
                {handoff.station_phone   && <div style={{ fontSize:12, color:'#6B7B6E', marginTop:2 }}>📞 {handoff.station_phone}</div>}
              </div>
            )}

            <div style={{ background:'#FFF8E1', border:'1px solid #FFE082', borderRadius:8, padding:'10px 14px', marginBottom:20, fontSize:13, color:'#5D4037' }}>
              ℹ️ Stage 1 estimate only. Agent physical check sets the exact C_final within this range.
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontWeight:600, fontSize:13, color:'#0D3B26', marginBottom:10 }}>Choose Collection Method</div>
              <div style={{ display:'flex', gap:10 }}>
                {[
                  { value:'drop_off', label:'Drop Off', icon:'🏢', sub:'Take device to nearest partner' },
                  { value:'pickup',   label:'Pickup',   icon:'🚗', sub:'Agent comes to you' },
                ].map(opt => (
                  <label key={opt.value} style={{ flex:1, border:`2px solid ${collMode===opt.value?'#0D3B26':'#E4EDE7'}`, background:collMode===opt.value?'#E8F5EE':'#fff', borderRadius:10, padding:'14px', cursor:'pointer', textAlign:'center' }}>
                    <input type="radio" value={opt.value} checked={collMode===opt.value} onChange={() => setCollMode(opt.value)} style={{ display:'none' }} />
                    <div style={{ fontSize:22 }}>{opt.icon}</div>
                    <div style={{ fontWeight:600, fontSize:13, color:'#0D3B26', margin:'6px 0 2px' }}>{opt.label}</div>
                    <div style={{ fontSize:11, color:'#6B7B6E' }}>{opt.sub}</div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button style={{ ...btnGreen, flex:1 }} onClick={handleAccept} disabled={loading}>
                {loading ? 'Accepting...' : 'Accept Offer →'}
              </button>
              <button style={btnOutline} onClick={() => deviceService.reject(device.id).then(reset)}>
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stage: accepted ── */}
      {stage === 'accepted' && (
        <div style={{ ...card, padding:36, textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
          <h2 style={{ margin:'0 0 10px', color:'#0D3B26' }}>Offer Accepted!</h2>
          <p style={{ color:'#6B7B6E', marginBottom:20, fontSize:14 }}>
            Your device is queued for physical assessment.
            Once the agent confirms, your wallet will be credited instantly.
          </p>

          {/* Repeat the code on the accepted screen */}
          {handoff && (
            <div style={{ background:'#E8F5EE', border:'2px solid #1A6B3C', borderRadius:12, padding:'20px', marginBottom:20, display:'inline-block', minWidth:240 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#1A6B3C', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Your Handoff Code</div>
              <div style={{ fontFamily:'monospace', fontSize:32, fontWeight:800, color:'#0D3B26', letterSpacing:'0.15em' }}>{handoff.code}</div>
              <div style={{ fontSize:12, color:'#6B7B6E', marginTop:6 }}>Show this at <strong>{handoff.station_name}</strong></div>
              {handoff.station_address && <div style={{ fontSize:11, color:'#aaa', marginTop:3 }}>{handoff.station_address}</div>}
            </div>
          )}

          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button style={btnGreen} onClick={reset}>Scan Another Device</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// DEVICES TAB
// ══════════════════════════════════════════════════════════
function DevicesTab({ devices }) {
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'#0D3B26' }}>My Devices</h1>
        <p style={{ margin:'4px 0 0', color:'#6B7B6E', fontSize:14 }}>{devices.length} device{devices.length!==1?'s':''} submitted</p>
      </div>
      <div style={card}>
        {devices.length > 0 ? (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F7FAF8' }}>
                {['Device','OMV (KES)','D','Q remote','Offer Range (KES)','C Final (KES)','β','Date','Status'].map(h => (
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:11, color:'#8A9E8E', textTransform:'uppercase', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id} style={{ borderTop:'1px solid #EEF3EF' }}>
                  <td style={{ padding:'12px', fontSize:13, fontWeight:600, color:'#0D3B26' }}>{d.name || `${d.make} ${d.model}`}</td>
                  <td style={{ padding:'12px', fontSize:12, color:'#6B7B6E' }}>{d.omv_kes ? fmt(d.omv_kes) : '—'}</td>
                  <td style={{ padding:'12px', fontSize:12 }}>{d.D ? parseFloat(d.D).toFixed(2) : '—'}</td>
                  <td style={{ padding:'12px', fontSize:12 }}>{d.q_remote ? parseFloat(d.q_remote).toFixed(2) : '—'}</td>
                  <td style={{ padding:'12px', fontSize:12 }}>{d.c_low ? `${fmt(d.c_low)}–${fmt(d.c_high)}` : '—'}</td>
                  <td style={{ padding:'12px', fontSize:13, fontWeight:600, color:'#1A6B3C' }}>{d.c_final ? fmt(d.c_final) : '—'}</td>
                  <td style={{ padding:'12px', fontSize:12, color:'#1A6B3C' }}>{d.beta ? `+${fmt(d.beta)}` : '—'}</td>
                  <td style={{ padding:'12px', fontSize:12, color:'#8A9E8E', whiteSpace:'nowrap' }}>{d.created_at ? new Date(d.created_at).toLocaleDateString('en-KE') : '—'}</td>
                  <td style={{ padding:'12px' }}><Badge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding:40, textAlign:'center', color:'#8A9E8E', fontSize:14 }}>
            No devices yet. Use "Scan Device" to submit your first device.
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// WALLET TAB
// ══════════════════════════════════════════════════════════
function WalletTab({ wallet, transactions }) {
  const [showForm,    setShowForm]    = useState(false);
  const [prevBalance, setPrevBalance] = useState(null);
  const [newCredit,   setNewCredit]   = useState(null);  // flash notification

  // Detect when balance increases (agent credited wallet)
  useEffect(() => {
    const current = parseFloat(wallet?.balance || 0);
    if (prevBalance !== null && current > prevBalance) {
      const diff = current - prevBalance;
      setNewCredit(diff);
      setTimeout(() => setNewCredit(null), 8000); // show for 8 seconds
    }
    setPrevBalance(current);
  }, [wallet?.balance]); // eslint-disable-line
  const [phone,    setPhone]    = useState('');
  const [amount,   setAmount]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState('');
  const [err,      setErr]      = useState('');

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setLoading(true); setErr(''); setMsg('');
    const { data, error } = await walletService.withdraw({ amount: parseFloat(amount), phone_number: phone });
    setLoading(false);
    if (error) { setErr(error); return; }
    setMsg(`KES ${amount} sent to ${phone}.`);
    setShowForm(false); setPhone(''); setAmount('');
  };

  const balance = parseFloat(wallet?.balance || 0);

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'#0D3B26' }}>Wallet</h1>
        <p style={{ margin:'4px 0 0', color:'#6B7B6E', fontSize:14 }}>Your RecycleCred earnings</p>
      </div>

      <div style={{ background:'linear-gradient(135deg,#0D3B26,#1A6B3C)', borderRadius:14, padding:'28px 32px', marginBottom:20 }}>
        <div style={{ color:'rgba(255,255,255,0.55)', fontSize:12, marginBottom:6 }}>AVAILABLE BALANCE</div>
        <div style={{ color:'#fff', fontSize:42, fontWeight:700 }}>KES {fmt(balance)}</div>
      </div>

      {/* Live credit notification — fires when agent confirms recycled */}
      {newCredit && (
        <div style={{ background:'#E8F5EE', border:'2px solid #1A6B3C', borderRadius:10, padding:'14px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:12, animation:'slideDown 0.3s ease' }}>
          <span style={{ fontSize:24 }}>🎉</span>
          <div>
            <div style={{ fontWeight:700, color:'#0D3B26', fontSize:14 }}>KES {fmt(newCredit)} credited to your wallet!</div>
            <div style={{ fontSize:12, color:'#6B7B6E', marginTop:2 }}>Your device has been recycled. Payment received.</div>
          </div>
        </div>
      )}
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {msg && <div style={{ background:'#E8F5EE', border:'1px solid #A5D6A7', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#1A6B3C', marginBottom:16 }}>{msg}</div>}
      {err && <div style={{ background:'#FFEBEE', border:'1px solid #FFCDD2', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#C62828', marginBottom:16 }}>{err}</div>}

      <button
        onClick={() => setShowForm(v => !v)}
        style={{ background:'#0D3B26', color:'#fff', border:'none', borderRadius:8, padding:'13px 24px', fontSize:14, fontWeight:600, cursor:'pointer', marginBottom:20 }}
      >
        {showForm ? 'Cancel' : 'Withdraw via M-Pesa'}
      </button>

      {showForm && (
        <div style={{ ...card, padding:20, marginBottom:20 }}>
          <form onSubmit={handleWithdraw}>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#0D3B26', marginBottom:6 }}>M-Pesa Number</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0712345678"
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #E4EDE7', borderRadius:8, fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }} required />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#0D3B26', marginBottom:6 }}>Amount (KES)</label>
              <input type="number" min="1" max={balance} value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 500"
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #E4EDE7', borderRadius:8, fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }} required />
            </div>
            <button type="submit" disabled={loading}
              style={{ background:'#0D3B26', color:'#fff', border:'none', borderRadius:8, padding:'13px 20px', fontSize:14, fontWeight:600, cursor:'pointer', width:'100%' }}>
              {loading ? 'Processing...' : 'Confirm Withdrawal'}
            </button>
          </form>
        </div>
      )}

      <div style={card}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #E4EDE7', fontWeight:700, color:'#0D3B26', fontSize:14 }}>Transaction History</div>
        {transactions?.length > 0 ? transactions.map(tx => (
          <div key={tx.id} style={{ padding:'12px 20px', borderTop:'1px solid #EEF3EF', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#0D3B26' }}>{tx.description}</div>
              <div style={{ fontSize:12, color:'#8A9E8E', marginTop:2 }}>{new Date(tx.created_at).toLocaleDateString('en-KE')}</div>
            </div>
            <span style={{ fontWeight:700, fontSize:15, color: tx.type==='credit' ? '#1A6B3C' : '#C62828' }}>
              {tx.type==='credit' ? '+' : '−'} KES {fmt(tx.amount)}
            </span>
          </div>
        )) : (
          <div style={{ padding:32, textAlign:'center', color:'#8A9E8E', fontSize:14 }}>No transactions yet.</div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// STATIONS TAB
// ══════════════════════════════════════════════════════════
function StationsTab({ stations, locStatus, onRequestLoc }) {
  if (locStatus !== 'granted') return (
    <div>
      <div style={{ marginBottom:24 }}><h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'#0D3B26' }}>Collection Points</h1></div>
      <div style={{ ...card, padding:40, textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>📍</div>
        <h2 style={{ margin:'0 0 10px', color:'#0D3B26' }}>Enable Location</h2>
        <p style={{ color:'#6B7B6E', marginBottom:20, fontSize:14 }}>
          {locStatus==='denied'
            ? 'Location was denied. Enable it in browser settings to sort by distance — proximity (P) also affects your offer.'
            : 'Share your location to find the nearest certified collection points and improve your proximity score (P).'}
        </p>
        <button onClick={onRequestLoc} disabled={locStatus==='requesting'}
          style={{ background:'#0D3B26', color:'#fff', border:'none', borderRadius:8, padding:'13px 24px', fontSize:14, fontWeight:600, cursor:'pointer' }}>
          {locStatus==='requesting' ? 'Requesting...' : 'Enable Location'}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'#0D3B26' }}>Collection Points</h1>
        <p style={{ margin:'4px 0 0', color:'#6B7B6E', fontSize:14 }}>{stations.length} certified partners · sorted by distance</p>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {stations.map(s => (
          <div key={s.id} style={{ ...card, padding:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:'#0D3B26' }}>{s.name}</div>
                <div style={{ fontSize:13, color:'#6B7B6E', marginTop:2 }}>{s.partner} · {s.location}</div>
              </div>
              {s.distance_km != null && (
                <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                  <div style={{ fontWeight:700, color:'#1A6B3C', fontSize:15 }}>{parseFloat(s.distance_km).toFixed(1)} km</div>
                  <div style={{ fontSize:11, color:'#6B7B6E' }}>P = {s.distance_km<=1?'1.0':s.distance_km<=5?'0.8':'0.6'}</div>
                </div>
              )}
            </div>
            {s.address         && <div style={{ fontSize:12, color:'#8A9E8E', marginTop:6 }}>📍 {s.address}</div>}
            {s.operating_hours && <div style={{ fontSize:12, color:'#8A9E8E', marginTop:3 }}>🕐 {s.operating_hours}</div>}
            {s.phone           && <div style={{ fontSize:12, color:'#8A9E8E', marginTop:3 }}>📞 {s.phone}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN DASHBOARD SHELL
// ══════════════════════════════════════════════════════════
export default function Dashboard() {
  const navigate = useNavigate();
  const [tab,          setTab]          = useState('home');
  const [user,         setUser]         = useState(null);
  const [devices,      setDevices]      = useState([]);
  const [wallet,       setWallet]       = useState({ balance:0 });
  const [transactions, setTransactions] = useState([]);
  const [stations,     setStations]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [location,     setLocation]     = useState(null);
  const [locStatus,    setLocStatus]    = useState('idle');

  const requestLoc = useCallback(() => {
    if (!navigator.geolocation) { setLocStatus('denied'); return; }
    setLocStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      pos => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocStatus('granted'); },
      ()  => setLocStatus('denied'),
      { enableHighAccuracy:true, timeout:10000 }
    );
  }, []);

  const loadData = useCallback(async () => {
    const [devRes, walRes] = await Promise.all([deviceService.list(), walletService.get()]);
    if (devRes.data?.devices)      setDevices(devRes.data.devices);
    if (walRes.data?.wallet)       setWallet(walRes.data.wallet);
    if (walRes.data?.transactions) setTransactions(walRes.data.transactions);
  }, []);

  // Poll wallet every 15 seconds — balance updates instantly when agent confirms recycled
  const pollWallet = useCallback(async () => {
    const { data } = await walletService.get();
    if (data?.wallet)       setWallet(data.wallet);
    if (data?.transactions) setTransactions(data.transactions);
  }, []);

  useEffect(() => {
    if (locStatus !== 'granted' || !location) return;
    stationService.list(location).then(({ data }) => { if (data?.stations) setStations(data.stations); });
  }, [locStatus, location]);

  useEffect(() => {
    let mounted = true;
    requestLoc();
    (async () => {
      const { data } = await authService.getSession();
      if (!mounted) return;
      if (!data?.session?.user) { navigate('/login'); return; }
      setUser(data.session.user);
      await loadData();
      setLoading(false);
    })();
    // Start wallet polling every 15 seconds
    const pollInterval = setInterval(pollWallet, 15000);

    return () => { mounted = false; clearInterval(pollInterval); };
  }, [navigate, loadData, requestLoc, pollWallet]);

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#F4F6F3' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>♻️</div>
        <div style={{ width:32, height:32, border:'3px solid #E4EDE7', borderTop:'3px solid #1A6B3C', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }} />
        <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  const name = user?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:"'Inter','Segoe UI',sans-serif", background:'#F4F6F3' }}>

      {/* Sidebar */}
      <aside style={{ width:236, background:'#0D3B26', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'24px 20px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:32, height:32, background:'#2D6A4F', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>♻️</div>
            <span style={{ color:'#fff', fontWeight:700, fontSize:16 }}>RecycleCred</span>
          </div>
        </div>

        <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', background:'#2D6A4F', display:'flex', alignItems:'center', justifyContent:'center', color:'#7FD4A8', fontWeight:700, fontSize:12, flexShrink:0 }}>
              {initials(name)}
            </div>
            <div style={{ overflow:'hidden' }}>
              <div style={{ color:'#fff', fontWeight:600, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{name}</div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>Customer</div>
            </div>
          </div>
        </div>

        <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:2 }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} style={{
              display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
              borderRadius:8, border:'none', cursor:'pointer', width:'100%', textAlign:'left',
              background: tab===item.id ? '#2D6A4F' : 'transparent',
              color: tab===item.id ? '#fff' : 'rgba(255,255,255,0.5)',
              fontSize:13, fontWeight: tab===item.id ? 600 : 400,
            }}>
              <span style={{ fontSize:15 }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding:'8px 8px 16px' }}>
          <button onClick={() => { authService.logout(); navigate('/login'); }} style={{
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
        {tab === 'home'     && <HomeTab     user={user} devices={devices} wallet={wallet} />}
        {tab === 'scan'     && <ScanTab     user={user} onRefresh={loadData} />}
        {tab === 'devices'  && <DevicesTab  devices={devices} />}
        {tab === 'wallet'   && <WalletTab   wallet={wallet} transactions={transactions} />}
        {tab === 'stations' && <StationsTab stations={stations} locStatus={locStatus} onRequestLoc={requestLoc} />}
      </main>
    </div>
  );
}