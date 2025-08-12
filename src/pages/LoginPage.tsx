import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const field = { display:'flex', flexDirection:'column' as const, gap:6 };

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [username, setUser] = useState('');
  const [password, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const from = (loc.state as any)?.from?.pathname || '/dashboard';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const ok = await login(username.trim(), password, remember);
    if (!ok) { setError('Invalid username or password.'); return; }
    nav(from, { replace: true });
  };

  return (
    <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', background:'#0b1220', color:'#e5e7eb', padding:20 }}>
      <form onSubmit={onSubmit} style={{ width:'min(420px,100%)', background:'#111827', border:'1px solid #1f2937', borderRadius:12, padding:20, boxShadow:'0 10px 30px rgba(0,0,0,.4)' }}>
        <h2 style={{ marginTop:0, marginBottom:12 }}>Sign in</h2>
        <div style={{ fontSize:12, opacity:.7, marginBottom:14 }}>Testing mode: {String(import.meta.env.VITE_TESTING_MODE === 'true')}</div>
        {error && <div style={{ background:'#7f1d1d', color:'#fee2e2', padding:'8px 10px', border:'1px solid #7f1d1d', borderRadius:6, marginBottom:12 }}>{error}</div>}
        <div style={field}>
          <label htmlFor="user">Username</label>
          <input id="user" value={username} onChange={e=>setUser(e.target.value)} placeholder="brennan" style={{ padding:'8px 10px', borderRadius:8, border:'1px solid #374151', background:'#0b1220', color:'#e5e7eb' }} />
        </div>
        <div style={{ height:10 }} />
        <div style={field}>
          <label htmlFor="pass">Password</label>
          <div style={{ display:'flex', gap:6 }}>
            <input id="pass" type={show ? 'text':'password'} value={password} onChange={e=>setPass(e.target.value)} placeholder="pob123" style={{ flex:1, padding:'8px 10px', borderRadius:8, border:'1px solid #374151', background:'#0b1220', color:'#e5e7eb' }} />
            <button type="button" onClick={()=>setShow(s=>!s)} style={{ padding:'8px 10px', borderRadius:8, background:'#334155', color:'#fff', border:'1px solid #475569' }}>{show ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        <div style={{ height:10 }} />
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <input id="remember" type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} />
          <label htmlFor="remember" style={{ fontSize:12 }}>Remember me</label>
        </div>
        <div style={{ height:16 }} />
        <button type="submit" style={{ width:'100%', padding:'10px 12px', borderRadius:8, background:'#2563eb', color:'#fff', border:'1px solid #1d4ed8', fontWeight:700 }}>Sign in</button>
        <div style={{ marginTop:12, fontSize:12 }}>
          <span style={{ opacity:.7 }}>Demo users: </span>
          <code>brennan/pob123</code>
          <span> or </span>
          <code>ops/pob123</code>
        </div>
        <div style={{ marginTop:10 }}><Link to="/dashboard" style={{ color:'#9ca3af' }}>Continue without login (for dev only)</Link></div>
      </form>
    </div>
  );
};

export default LoginPage;
