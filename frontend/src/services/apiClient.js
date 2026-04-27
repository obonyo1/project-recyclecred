const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getToken()        { return localStorage.getItem('rc_token'); }
function saveToken(t)      { localStorage.setItem('rc_token', t); }
function clearToken()      { localStorage.removeItem('rc_token'); }
function getAgentToken()   { return localStorage.getItem('rc_agent_token'); }
function saveAgentToken(t) { localStorage.setItem('rc_agent_token', t); }
function clearAgentToken() { localStorage.removeItem('rc_agent_token'); }

async function request(path, options = {}, useAgentToken = false) {
  const token = useAgentToken ? getAgentToken() : getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  let res;
  try { res = await fetch(`${BASE_URL}${path}`, { ...options, headers }); }
  catch { return { data: null, error: 'Cannot reach the server. Is the backend running on port 5000?' }; }
  if (res.status === 204) return { data: null, error: null };
  let json;
  try { json = await res.json(); } catch { return { data: null, error: 'Invalid server response.' }; }
  if (!res.ok) return { data: null, error: json.error || `Request failed (${res.status})` };
  return { data: json, error: null };
}

export const authService = {
  async register(payload) {
    return request('/auth/register', { method:'POST', body:JSON.stringify(payload) });
  },
  async login({ email, password }) {
    const result = await request('/auth/login', { method:'POST', body:JSON.stringify({ email, password }) });
    if (result.data?.token) { saveToken(result.data.token); localStorage.setItem('rc_user', JSON.stringify(result.data.user)); }
    return result;
  },
  logout() { clearToken(); },
  async getSession() {
    if (!getToken()) return { data: { session: null }, error: null };
    const result = await request('/auth/me');
    if (result.error) { clearToken(); return { data: { session: null }, error: null }; }
    return { data: { session: { user: { ...result.data.user } } }, error: null };
  },
  async resendVerification(email) {
    return request('/auth/resend-verification', { method:'POST', body:JSON.stringify({ email }) });
  },
};

export const agentAuthService = {
  async login({ email, password }) {
    const result = await request('/agent/auth/login', { method:'POST', body:JSON.stringify({ email, password }) });
    if (result.data?.token) { saveAgentToken(result.data.token); localStorage.setItem('rc_agent', JSON.stringify(result.data.agent)); }
    return result;
  },
  logout() { clearAgentToken(); },
  async getSession() {
    if (!getAgentToken()) return { data: { session: null }, error: null };
    const result = await request('/agent/auth/me', {}, true);
    if (result.error) { clearAgentToken(); return { data: { session: null }, error: null }; }
    return { data: { session: { agent: result.data.agent } }, error: null };
  },
};

export const deviceService = {
  async list()    { return request('/devices'); },
  async get(id)   { return request(`/devices/${id}`); },
  async submit(payload) { return request('/devices', { method:'POST', body:JSON.stringify(payload) }); },
  async acceptOffer(id, payload) { return request(`/devices/${id}/accept-offer`, { method:'POST', body:JSON.stringify(payload) }); },
  async reject(id) { return request(`/devices/${id}/reject`, { method:'POST', body:JSON.stringify({}) }); },
  async searchCatalogue(q) { return request(`/catalogue/search?q=${encodeURIComponent(q)}`); },
};

export const agentDeviceService = {
  async list()  { return request('/agent/devices', {}, true); },
  async get(id) { return request(`/agent/devices/${id}`, {}, true); },
  async lookupByCode(code) { return request(`/agent/devices/lookup?code=${encodeURIComponent(code)}`, {}, true); },
  async assess(id, payload) { return request(`/agent/devices/${id}/assess`, { method:'POST', body:JSON.stringify(payload) }, true); },
  async confirmRecycled(id) { return request(`/agent/devices/${id}/confirm-recycled`, { method:'POST', body:JSON.stringify({}) }, true); },
  async stats() { return request('/agent/stats', {}, true); },
};

export const walletService = {
  async get() { return request('/wallet'); },
  async withdraw({ amount, phone_number }) { return request('/wallet/withdraw', { method:'POST', body:JSON.stringify({ amount, phone_number }) }); },
};

export const stationService = {
  async list({ lat, lng } = {}) { return request(`/stations${lat && lng ? `?lat=${lat}&lng=${lng}` : ''}`); },
  async get(id) { return request(`/stations/${id}`); },
};