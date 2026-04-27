import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { authService, agentAuthService } from './services/apiClient';
import Landing        from './pages/Landing';
import Signup         from './pages/Signup';
import Login          from './pages/Login';
import AgentLogin     from './pages/AgentLogin';
import VerifyEmail    from './pages/VerifyEmail';
import CheckEmail     from './pages/CheckEmail';
import Dashboard      from './pages/Dashboard';
import AgentDashboard from './pages/AgentDashboard';

const Spinner = () => (
  <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#F4F6F3' }}>
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:32, marginBottom:16 }}>♻️</div>
      <div style={{ width:32, height:32, border:'3px solid #E4EDE7', borderTop:'3px solid #1A6B3C', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }} />
      <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const [state, setState] = useState('checking');
  const location = useLocation();
  useEffect(() => {
    authService.getSession().then(({ data }) => {
      setState(data?.session?.user ? 'ok' : 'denied');
    });
  }, []);
  if (state === 'checking') return <Spinner />;
  if (state === 'denied')   return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
};

const AgentProtectedRoute = ({ children }) => {
  const [state, setState] = useState('checking');
  const location = useLocation();
  useEffect(() => {
    agentAuthService.getSession().then(({ data }) => {
      setState(data?.session?.agent ? 'ok' : 'denied');
    });
  }, []);
  if (state === 'checking') return <Spinner />;
  if (state === 'denied')   return <Navigate to="/agent/login" state={{ from: location.pathname }} replace />;
  return children;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/"                     element={<Landing />} />
        <Route path="/signup"               element={<Signup />} />
        <Route path="/login"                element={<Login />} />
        <Route path="/agent/login"          element={<AgentLogin />} />
        <Route path="/verify-email"         element={<VerifyEmail />} />
        <Route path="/check-email"          element={<CheckEmail />} />
        <Route path="/customer/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/agent/dashboard/*"    element={<AgentProtectedRoute><AgentDashboard /></AgentProtectedRoute>} />
        <Route path="*"                     element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}