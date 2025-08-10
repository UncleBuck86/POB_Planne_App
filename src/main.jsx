import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Personnel from './pages/Personnel.jsx';
import Logistics from './pages/Logistics.jsx';
import FlightManifestTemplate from './pages/FlightManifestTemplate.jsx';
import FlightManifestView from './pages/FlightManifestView.jsx';
import AdminPage from './pages/Admin.jsx';
import { isAdmin as checkAdmin } from './pages/Admin.jsx';
import { ThemeProvider, useTheme } from './ThemeContext.jsx';

function RootRouter() {
	const [page, setPage] = useState(window.location.hash.replace('#','') || 'dashboard');
	React.useEffect(() => {
		const onHash = () => setPage(window.location.hash.replace('#','') || 'dashboard');
		window.addEventListener('hashchange', onHash);
		return () => window.removeEventListener('hashchange', onHash);
	}, []);
	let content = null;
	if (page === 'planner') content = <App />;
	else if (page === 'personnel') content = <Personnel />;
	else if (page === 'manifest') content = <FlightManifestTemplate />;
	else if (page.startsWith('manifest-view')) content = <FlightManifestView />;
	else if (page === 'admin') content = checkAdmin() ? <AdminPage /> : <Dashboard />;
	else if (page.startsWith('logistics')) content = <Logistics />;
	else content = <Dashboard />;
	return (
		<ThemeProvider>
			<NavShell page={page} content={content} />
		</ThemeProvider>
	);
}

function NavShell({ page, content }) {
	const { theme, team, changeTheme } = useTheme();
	const [open, setOpen] = useState(false);
	const [adminEnabled, setAdminEnabled] = useState(checkAdmin());
	const ref = useRef(null);
	const gearRef = useRef(null);
	useEffect(()=>{
		if(!open) return; const handler = (e)=>{ const m=ref.current; const g=gearRef.current; if(m && (m.contains(e.target)||g?.contains(e.target))) return; setOpen(false); }; const key=(e)=>{ if(e.key==='Escape') setOpen(false);};
		window.addEventListener('mousedown',handler); window.addEventListener('touchstart',handler); window.addEventListener('keydown',key);
		return ()=>{ window.removeEventListener('mousedown',handler); window.removeEventListener('touchstart',handler); window.removeEventListener('keydown',key); };
	},[open]);
	return (
		<div style={{ minHeight:'100vh' }}>
			<nav style={{ display:'flex', alignItems:'flex-end', gap:8, padding:'10px 18px 4px', borderBottom:'3px solid #222', background:'#111', position:'sticky', top:0, zIndex:80 }}>
				<div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
				{[
					{ key: 'dashboard', label: 'Dashboard', color: '#2d6cdf' },
					{ key: 'planner', label: 'Planner', color: '#7a3cc2' },
					{ key: 'personnel', label: 'Personnel', color: '#c2571d' },
					{ key: 'logistics', label: 'Logistics', color: '#198a5a' },
					{ key: 'manifest', label: 'Manifest', color: '#d94f90' },
					...(adminEnabled ? [{ key: 'admin', label: 'Admin', color: '#555' }] : [])
				].map(tab => {
					const active = page === tab.key;
					return (
						<a key={tab.key} href={'#'+tab.key} style={{
							display:'inline-block', padding:'10px 18px 8px', fontWeight:600, fontSize:15, letterSpacing:'.5px', textDecoration:'none', color:'#fff', background:tab.color, borderTopLeftRadius:8, borderTopRightRadius:8, boxShadow: active ? '0 0 0 1px #000, 0 2px 4px rgba(0,0,0,.4)' : '0 0 0 1px #000', position:'relative', transform: active ? 'translateY(0)' : 'translateY(4px)', transition:'transform .2s, box-shadow .2s, filter .2s', filter: active ? 'brightness(1)' : 'brightness(.85)', border:'1px solid #000', borderBottom: active ? '3px solid #111' : '1px solid #000'
						}}
							onMouseEnter={e=> e.currentTarget.style.filter='brightness(1)'}
							onMouseLeave={e=> e.currentTarget.style.filter= active ? 'brightness(1)' : 'brightness(.85)'}
						>{tab.label}</a>
					);
				})}
				</div>
				<div style={{ marginLeft:'auto', position:'relative' }}>
					<button ref={gearRef} onClick={()=>setOpen(o=>!o)} title="Theme Settings" style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:24, lineHeight:1, color:'#fff', padding:'0 4px' }}>⚙️</button>
					{open && (
						<div ref={ref} style={{ position:'absolute', top:40, right:0, background: theme.surface, color: theme.text, border:'1px solid '+(theme.primary||'#444'), borderRadius:10, padding:'12px 14px 14px', boxShadow:'0 4px 14px rgba(0,0,0,0.4)', minWidth:220, zIndex:200 }}>
							<div style={{ fontWeight:'bold', marginBottom:6, fontSize:13 }}>Settings</div>
							<label style={{ fontSize:11, opacity:.7 }}>Theme:</label>
							<select value={team} onChange={e=>{ changeTheme(e.target.value); setOpen(false); }} style={{ width:'100%', marginBottom:10 }}>
								<option value='light'>Light</option>
								<option value='dark'>Dark</option>
							</select>
							<div style={{ borderTop:'1px solid '+(theme.primary||'#444'), margin:'6px 0 8px' }} />
							<div style={{ fontWeight:'bold', marginBottom:6, fontSize:12 }}>Admin</div>
							{!adminEnabled && (
								<button onClick={()=>{ try { localStorage.setItem('pobIsAdmin','true'); } catch{}; setAdminEnabled(true); setOpen(false); window.location.hash='#admin'; }} style={{ display:'block', width:'100%', textAlign:'left', background: theme.primary, color: theme.text, border:'1px solid '+(theme.secondary||'#222'), padding:'6px 8px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600 }}>Enable Admin Mode</button>
							)}
							{adminEnabled && (
								<div style={{ display:'flex', flexDirection:'column', gap:6 }}>
									<a href="#admin" onClick={()=>setOpen(false)} style={{ textDecoration:'none', background: theme.primary, color: theme.text, padding:'6px 8px', borderRadius:6, fontSize:12, fontWeight:600, border:'1px solid '+(theme.secondary||'#222'), textAlign:'center' }}>Admin Panel</a>
									<button onClick={()=>{ if(window.confirm('Disable admin mode?')) { try { localStorage.removeItem('pobIsAdmin'); } catch{}; setAdminEnabled(false); if(window.location.hash==='#admin') window.location.hash='#dashboard'; setOpen(false);} }} style={{ background:'#922', color:'#fff', border:'1px solid #b55', padding:'6px 8px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600 }}>Disable Admin</button>
								</div>
							)}
						</div>
					)}
				</div>
			</nav>
			{content}
		</div>
	);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<RootRouter />);
