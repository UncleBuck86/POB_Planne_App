import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AISidebar from './components/AISidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Personnel from './pages/Personnel.jsx';
import Logistics from './pages/Logistics.jsx';
import POBPage from './pages/POB.jsx';
import AdminPage, { isAdmin as checkAdmin } from './pages/Admin.jsx';
import FlightsPage from './pages/Flights.jsx';
import FlightManifestView from './pages/FlightManifestView.jsx';
import FlightManifestTemplate from './pages/FlightManifestTemplate.jsx';
import { ThemeProvider, useTheme } from './ThemeContext.jsx';
import GlobalStyle from './GlobalStyle.jsx';
import { initPassiveAI, registerContextProvider, setPassiveAIEnabled, setPassiveDebug, setPassiveInterval, triggerPassiveNow, setPassiveSystemPrompt, setPassiveRedaction } from './ai/passiveAI.js';
import { emitDomain } from './ai/eventBus.js';
import { isOpenAI } from './ai/client.js';
import { ToastProvider } from './alerts/ToastProvider.jsx';
import { storage } from './utils/storageAdapter';

function RootRouter() {
	const [hash, setHash] = useState(window.location.hash.replace('#','') || 'dashboard');
	React.useEffect(() => {
		const onHash = () => setHash(window.location.hash.replace('#','') || 'dashboard');
		window.addEventListener('hashchange', onHash);
		return () => window.removeEventListener('hashchange', onHash);
	}, []);
	let content = null;
	if (hash.startsWith('logistics/manifest-view/')) {
		content = <FlightManifestView />;
	} else if (hash === 'logistics/manifest' || hash === 'logistics/flights/manifest') {
		content = <FlightManifestTemplate />;
	} else if (hash.startsWith('logistics/flights')) {
		content = <FlightsPage />;
	} else if (hash.startsWith('logistics/boats')) {
		// Add boats page/component if exists
		content = <div style={{padding:24}}><h2>Boats Logistics</h2><p>Boats page placeholder.</p></div>;
	} else if (hash.startsWith('logistics/other')) {
		// Add other logistics page/component if exists
		content = <div style={{padding:24}}><h2>Other Logistics</h2><p>Other logistics page placeholder.</p></div>;
	} else if (hash.startsWith('logistics')) {
		// Only render Logistics if not manifest or manifest-view
		if (hash !== 'logistics/manifest' && !hash.startsWith('logistics/manifest-view/')) {
			content = <Logistics />;
		}
	} else if (hash === 'planner') content = <App />;
	else if (hash === 'personnel') content = <Personnel />;
	else if (hash === 'admin') content = checkAdmin() ? <AdminPage /> : <Dashboard />;
	else if (hash === 'pob') content = <POBPage />;
	else content = <Dashboard />;
	return (
		<ThemeProvider>
			<GlobalStyle />
			<ToastProvider>
				<NavShell page={hash.split('/')[0]} content={content} />
			</ToastProvider>
		</ThemeProvider>
	);
}

function NavShell({ page, content }) {
	const { theme, team, changeTheme, density, changeDensity, readOnly, changeReadOnly } = useTheme();
	const [open, setOpen] = useState(false);
	// Global AI sidebar state & suggestion
	const [aiSidebarOpen, setAISidebarOpen] = useState(false);
	const [aiSuggestion, setAISuggestion] = useState('');
	const [adminEnabled, setAdminEnabled] = useState(checkAdmin());
	const [passiveAI, setPassiveAI] = useState(()=> storage.get('buckPassiveAI') !== 'false');
	const [passiveDebug, setPassiveDebug] = useState(()=> storage.getBool('buckPassiveDebug', false));
	const [passiveInterval, setPassiveIntervalState] = useState(()=> { const v = parseInt(storage.get('buckPassiveInterval'),10); return Number.isFinite(v) ? v : 60000; });
	const [systemPrompt, setSystemPrompt] = useState(()=> storage.get('buckPassiveSystemPrompt') || '');
	const [redaction, setRedaction] = useState(()=> storage.getBool('buckPassiveRedaction', false));
	const TOAST_PREF_KEY = 'pobToastDisabled';
	const [toastDisabled, setToastDisabled] = useState(() => storage.getBool(TOAST_PREF_KEY, false));
	const toggleToastPref = () => {
		setToastDisabled(prev => {
			const next = !prev; storage.setBool(TOAST_PREF_KEY, next);
			return next;
		});
	};
	// Planner page location selection state
	const [plannerLocation, setPlannerLocation] = useState(() => storage.get('pobPlannerLocation') || '');
	const [plannerLocationOptions, setPlannerLocationOptions] = useState(() => storage.getJSON('flightManifestLocations', []));
	// Persist planner location selection
	useEffect(() => { storage.set('pobPlannerLocation', plannerLocation); }, [plannerLocation]);
	// Listen for external updates to locations list (Admin page changes)
	useEffect(() => {
		const handler = (e) => {
			if (e.key === 'flightManifestLocations') {
				try { setPlannerLocationOptions(JSON.parse(e.newValue) || []); } catch { setPlannerLocationOptions([]); }
			}
		};
		window.addEventListener('storage', handler);
		return () => window.removeEventListener('storage', handler);
	}, []);
	const ref = useRef(null);
	const gearRef = useRef(null);
	useEffect(()=>{
		if(!open) return; const handler = (e)=>{ const m=ref.current; const g=gearRef.current; if(m && (m.contains(e.target)||g?.contains(e.target))) return; setOpen(false); }; const key=(e)=>{ if(e.key==='Escape') setOpen(false);};
		window.addEventListener('mousedown',handler); window.addEventListener('touchstart',handler); window.addEventListener('keydown',key);
		return ()=>{ window.removeEventListener('mousedown',handler); window.removeEventListener('touchstart',handler); window.removeEventListener('keydown',key); };
	},[open]);
	// Passive AI init (once)
	useEffect(()=>{
		initPassiveAI();
		registerContextProvider('page', ()=> ({ page, hash: window.location.hash }));
		registerContextProvider('window', ()=> ({ w: window.innerWidth, h: window.innerHeight }));
		registerContextProvider('personnel', ()=> { try { return window.__buckPersonnelCtx? window.__buckPersonnelCtx(): null; } catch { return null; } });
		registerContextProvider('flights', ()=> { try { return window.__buckFlightsCtx? window.__buckFlightsCtx(): null; } catch { return null; } });
		registerContextProvider('pob', ()=> { try { return window.__buckPobCtx? window.__buckPobCtx(): null; } catch { return null; } });
		registerContextProvider('admin', ()=> { try { return window.__buckAdminCtx? window.__buckAdminCtx(): null; } catch { return null; } });
		const onResize = () => { /* force snapshot by emitting synthetic event */ window.dispatchEvent(new CustomEvent('passiveWindowResize')); };
		window.addEventListener('resize', onResize);
		const clickHandler = (e) => {
			try {
				const tgt = e.target;
				if(!tgt) return;
				// Derive a brief label: prefer data-ai-label, else text of button/link (trimmed)
				let label = '';
				if(tgt.getAttribute) label = tgt.getAttribute('data-ai-label') || '';
				if(!label && tgt.closest) {
					const btn = tgt.closest('button, a');
					if(btn){ label = (btn.getAttribute('data-ai-label') || btn.textContent || '').trim().slice(0,60); }
				}
				if(!label) return; // only emit for labeled / meaningful clicks
				emitDomain('UI_CLICK', { label, page }, 'Click '+label);
			} catch {/* ignore */}
		};
		window.addEventListener('click', clickHandler, true);
		setPassiveAIEnabled(passiveAI);
		setPassiveDebug(passiveDebug);
		return ()=> { window.removeEventListener('resize', onResize); window.removeEventListener('click', clickHandler, true); };
	// eslint-disable-next-line react-hooks/exhaustive-deps
	},[]);
		useEffect(()=>{ storage.setBool('buckPassiveAI', !!passiveAI); setPassiveAIEnabled(passiveAI); }, [passiveAI]);
		useEffect(()=>{ storage.setBool('buckPassiveDebug', !!passiveDebug); setPassiveDebug(passiveDebug); }, [passiveDebug]);
		useEffect(()=>{ storage.set('buckPassiveInterval', String(passiveInterval)); setPassiveInterval(passiveInterval); }, [passiveInterval]);
		useEffect(()=>{ if(systemPrompt.trim()){ storage.set('buckPassiveSystemPrompt', systemPrompt); setPassiveSystemPrompt(systemPrompt); } }, [systemPrompt]);
		useEffect(()=>{ storage.setBool('buckPassiveRedaction', !!redaction); setPassiveRedaction(redaction); }, [redaction]);
	// Listen for global AI events
	useEffect(()=>{
		if (!isOpenAI) return; // AI disabled: do not wire events
		const openEvt = () => setAISidebarOpen(true);
		const setSuggestionEvt = (e) => { if (typeof e.detail === 'string') setAISuggestion(e.detail); };
		window.addEventListener('openAISidebar', openEvt);
		window.addEventListener('setAISuggestion', setSuggestionEvt);
		return ()=>{ window.removeEventListener('openAISidebar', openEvt); window.removeEventListener('setAISuggestion', setSuggestionEvt); };
	},[]);
	// Inject ear flick animation CSS once
	useEffect(()=>{
		if (window.__buckEarCSSInjected) return; // guard
		const style = document.createElement('style');
		style.textContent = `@keyframes buckEarFlick{0%{transform:rotate(0deg);}20%{transform:rotate(-18deg);}40%{transform:rotate(12deg);}60%{transform:rotate(-8deg);}80%{transform:rotate(4deg);}100%{transform:rotate(0deg);} }\n.buck-ear-flick{animation:buckEarFlick .65s ease-out; transform-origin:50% 90%;}`;
		document.head.appendChild(style);
		window.__buckEarCSSInjected = true;
	},[]);
	// Inject global accessibility styles (focus rings, keyboard outlines)
	useEffect(()=>{
		if (window.__buckA11yCSSInjected) return;
		const style = document.createElement('style');
		style.textContent = `
		  :root{ --focus-ring:#2d6cdf; --focus-ring-dark:#9ec1ff; }
		  *:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: 2px; }
		  @media (prefers-color-scheme: dark){ *:focus-visible { outline-color: var(--focus-ring-dark); } }
		  [role="button"], [tabindex]:not([tabindex="-1"]) { outline-offset: 2px; }
		`;
		document.head.appendChild(style);
		window.__buckA11yCSSInjected = true;
	},[]);
	// Context provider for AI: if on dashboard and dashboard has registered builder
	const getAIContext = () => {
		if (page === 'dashboard' && typeof window.__getDashboardAIContext === 'function') {
			try { return window.__getDashboardAIContext(); } catch { return { page, timestamp: new Date().toISOString() }; }
		}
		return { page, timestamp: new Date().toISOString() };
	};
	return (
		<div style={{ minHeight:'100vh' }}>
			<nav style={{ display:'flex', alignItems:'flex-end', gap:8, padding:'10px 18px 4px', borderBottom:'3px solid #222', background:'#111', position:'sticky', top:0, zIndex:120 }}>
				<div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
				{[
					{ key: 'dashboard', label: 'Dashboard', color: '#2d6cdf' },
					{ key: 'planner', label: 'Planner', color: '#7a3cc2' },
					{ key: 'personnel', label: 'Personnel', color: '#c2571d' },
					{ key: 'logistics', label: 'Logistics', color: '#198a5a' },
					{ key: 'pob', label: 'POB', color: '#d94f90' },
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
				<div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10, position:'relative' }}>
					{readOnly && (
						<span title="Read-only mode" style={{ color:'#fff', background:'#6b7280', border:'1px solid #111', padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:700, letterSpacing:.4 }}>READ-ONLY</span>
					)}
					{isOpenAI && (
					<button
						onClick={()=>{ window.dispatchEvent(new CustomEvent('openAISidebar')); }}
						title="Ask Buck (AI Assistant)"
						style={{
							position:'relative',
							background:'linear-gradient(120deg,#1d4ed8,#6366f1,#8b5cf6)',
							backgroundSize:'220% 220%',
							color:'#fff',
							border:'1px solid #253b80',
							padding:'8px 16px 8px 46px',
							borderRadius:10,
							cursor:'pointer',
							fontSize:14,
							fontWeight:700,
							letterSpacing:'.5px',
							boxShadow:'0 4px 10px -2px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)',
							transition:'background-position .8s ease, transform .15s ease, box-shadow .3s ease',
							overflow:'hidden'
						}}
						onMouseEnter={e=>{ 
							e.currentTarget.style.backgroundPosition='90% 10%'; 
							e.currentTarget.style.boxShadow='0 6px 14px -2px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07)';
							// trigger ear flick
							const leftEar = e.currentTarget.querySelector('.buck-ear-left');
							const rightEar = e.currentTarget.querySelector('.buck-ear-right');
							[leftEar,rightEar].forEach(el=>{ if(!el) return; el.classList.remove('buck-ear-flick'); void el.offsetWidth; });
							if(leftEar){ leftEar.classList.add('buck-ear-flick'); }
							if(rightEar){ setTimeout(()=> rightEar.classList.add('buck-ear-flick'),120); }
						}}
						onMouseLeave={e=>{ e.currentTarget.style.backgroundPosition='0% 50%'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 10px -2px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)'; }}
						onMouseDown={e=>{ e.currentTarget.style.transform='translateY(2px)'; }}
						onMouseUp={e=>{ e.currentTarget.style.transform='translateY(0)'; }}
					>
						<span style={{ position:'absolute', left:10, top:7, width:28, height:28, borderRadius:'50%', background:'linear-gradient(145deg,#0f172a,#1e293b)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 0 2px rgba(255,255,255,0.12), 0 2px 4px rgba(0,0,0,0.5)', overflow:'hidden' }} aria-hidden="true" className="buck-stag-icon">
							<svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display:'block' }}>
								<defs>
									<linearGradient id="buckGradFace" x1="16" y1="12" x2="48" y2="56" gradientUnits="userSpaceOnUse">
										<stop stopColor="#fbbf24" />
										<stop offset="60%" stopColor="#d97706" />
										<stop offset="100%" stopColor="#92400e" />
									</linearGradient>
									<linearGradient id="buckGradAntler" x1="0" y1="0" x2="64" y2="0" gradientUnits="userSpaceOnUse">
										<stop stopColor="#e2e8f0" />
										<stop offset="100%" stopColor="#94a3b8" />
									</linearGradient>
								</defs>
								{/* Antlers simplified */}
								<path d="M18 10 L14 6 L12 8 L16 14 L16 18 L12 22 L14 24 L18 20 L20 24 L24 26 L24 22 L22 18 L22 14 Z" stroke="url(#buckGradAntler)" strokeWidth="2" strokeLinejoin="round" fill="none" />
								<path d="M46 10 L50 6 L52 8 L48 14 L48 18 L52 22 L50 24 L46 20 L44 24 L40 26 L40 22 L42 18 L42 14 Z" stroke="url(#buckGradAntler)" strokeWidth="2" strokeLinejoin="round" fill="none" />
								{/* Ears */}
								<path className="buck-ear-left" d="M22 18 L18 30 L24 30 L26 20 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" />
								<path className="buck-ear-right" d="M42 18 L46 30 L40 30 L38 20 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" />
								{/* Head */}
								<path d="M24 20 L40 20 L46 30 L40 48 L32 54 L24 48 L18 30 Z" fill="url(#buckGradFace)" stroke="#78350f" strokeWidth="1.2" strokeLinejoin="round" />
								{/* Eyes */}
								<circle cx="28" cy="34" r="3" fill="#1e293b" />
								<circle cx="36" cy="34" r="3" fill="#1e293b" />
								<circle cx="27.5" cy="33.5" r="1.2" fill="#fef3c7" />
								<circle cx="35.5" cy="33.5" r="1.2" fill="#fef3c7" />
								{/* Snout */}
								<path d="M30 38 L34 38 L36 44 L32 48 L28 44 Z" fill="#78350f" stroke="#431407" strokeWidth="1" />
								<circle cx="32" cy="42.5" r="1.6" fill="#0f172a" />
							</svg>
						</span>
						<span style={{ position:'relative', zIndex:2 }}>Ask Buck</span>
						<span style={{ position:'absolute', inset:0, pointerEvents:'none', background:'radial-gradient(circle at 20% 15%, rgba(255,255,255,0.25), transparent 60%)', mixBlendMode:'overlay', opacity:.5 }} />
					</button>
					)}
					{/* Global AI Sidebar mounted only if AI is enabled */}
					{isOpenAI && (
						<AISidebar
							open={aiSidebarOpen}
							setOpen={setAISidebarOpen}
							suggestion={aiSuggestion}
							getContext={getAIContext}
							onAsk={(q)=>{ /* handled internally by AISidebar stream */ return q; }}
						/>
					)}
					<button ref={gearRef} onClick={()=>setOpen(o=>!o)} title="Theme Settings" style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:24, lineHeight:1, color:'#fff', padding:'0 4px' }}>⚙️</button>
					{open && (
						<div ref={ref} style={{ position:'absolute', top:40, right:0, background: theme.surface, color: theme.text, border:'1px solid '+(theme.primary||'#444'), borderRadius:10, padding:'12px 14px 14px', boxShadow:'0 4px 14px rgba(0,0,0,0.4)', minWidth:220, zIndex:200 }}>
							<div style={{ fontWeight:'bold', marginBottom:6, fontSize:13 }}>Settings</div>
							<label style={{ fontSize:11, opacity:.7 }}>Theme:</label>
							<select value={team} onChange={e=>{ changeTheme(e.target.value); setOpen(false); }} style={{ width:'100%', marginBottom:10 }}>
								<option value='light'>Light</option>
								<option value='dark'>Dark</option>
							</select>
							<label style={{ fontSize:11, opacity:.7 }}>Density:</label>
							<select value={density} onChange={e=>{ changeDensity(e.target.value); setOpen(false); }} style={{ width:'100%', marginBottom:10 }}>
								<option value='comfort'>Comfort</option>
								<option value='compact'>Compact</option>
							</select>
							<div style={{ display:'flex', alignItems:'center', gap:6, margin:'2px 0 10px' }}>
								<input id="toggle-readonly" type="checkbox" checked={!!readOnly} onChange={e=> changeReadOnly(e.target.checked)} />
								<label htmlFor="toggle-readonly" style={{ fontSize:11 }}>Enable Read-only Mode</label>
							</div>
							{page==='planner' && (
								<div style={{ marginBottom:10 }}>
									<label style={{ fontSize:11, opacity:.7 }}>Planner Location:</label>
									<select value={plannerLocation} onChange={e=> setPlannerLocation(e.target.value)} style={{ width:'100%', marginTop:4 }} title="Select active planner location">
										<option value=''>-- Select Location --</option>
										{plannerLocationOptions.map(loc => <option key={loc} value={loc}>{loc}</option>)}
									</select>
								</div>
							)}
							{(page==='planner' || page==='pob') && (
								<button onClick={()=>{ window.dispatchEvent(new Event('openPlannerEditCompanies')); setOpen(false); }} style={{ display:'block', width:'100%', textAlign:'left', background: theme.primary, color: theme.text, border:'1px solid '+(theme.secondary||'#222'), padding:'6px 8px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600, marginBottom:10 }}>Edit Companies</button>
							)}
							{page==='dashboard' && (
								<button onClick={()=>{ window.dispatchEvent(new Event('openDashboardSettings')); setOpen(false); }} style={{ display:'block', width:'100%', textAlign:'left', background: theme.primary, color: theme.text, border:'1px solid '+(theme.secondary||'#222'), padding:'6px 8px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600, marginBottom:10 }}>Dashboard Layout</button>
							)}
							<div style={{ display:'flex', alignItems:'center', gap:6, margin:'2px 0 10px' }}>
								<input id="toggle-toast" type="checkbox" checked={!toastDisabled} onChange={toggleToastPref} />
								<label htmlFor="toggle-toast" style={{ fontSize:11 }}>Enable Pop-up Notifications</label>
							</div>
							<div style={{ borderTop:'1px solid '+(theme.primary||'#444'), margin:'6px 0 8px' }} />
							<div style={{ fontWeight:'bold', marginBottom:6, fontSize:12 }}>AI Settings</div>
														<div style={{ fontSize:10, color:'#f3d9a4', background:'#3a2e14', border:'1px solid #6b4e16', padding:'6px 8px', borderRadius:6, margin:'0 0 8px' }}>
															Privacy: This app stores planner, manifests, and personnel data in your browser's localStorage. No data is sent to external services.
														</div>
							<div style={{ display:'flex', alignItems:'center', gap:6, margin:'2px 0 6px' }}>
								<input id="toggle-passive-ai" type="checkbox" checked={passiveAI} onChange={e=> setPassiveAI(e.target.checked)} />
								<label htmlFor="toggle-passive-ai" style={{ fontSize:11 }}>Passive Suggestions</label>
							</div>
							<div style={{ display:'flex', alignItems:'center', gap:6, margin:'2px 0 8px' }}>
								<input id="toggle-passive-debug" type="checkbox" checked={passiveDebug} onChange={e=> setPassiveDebug(e.target.checked)} />
								<label htmlFor="toggle-passive-debug" style={{ fontSize:11 }}>Passive Debug Mode</label>
							</div>
							<div style={{ display:'flex', flexDirection:'column', gap:4, margin:'4px 0 6px' }}>
								<label style={{ fontSize:11, opacity:.7 }}>Passive Interval (sec): {Math.round(passiveInterval/1000)}</label>
								<input type="range" min={15} max={300} value={Math.round(passiveInterval/1000)} onChange={e=> setPassiveIntervalState(parseInt(e.target.value,10)*1000)} />
							</div>
							<div style={{ margin:'4px 0 6px' }}>
								<label style={{ fontSize:11, opacity:.7, display:'block', marginBottom:4 }}>Passive System Prompt (optional)</label>
								<textarea rows={3} value={systemPrompt} onChange={e=> setSystemPrompt(e.target.value)} placeholder="Custom system prompt for Buck" style={{ width:'100%', resize:'vertical', fontSize:11 }} />
							</div>
							<div style={{ display:'flex', alignItems:'center', gap:6, margin:'2px 0 6px' }}>
								<input id="toggle-redaction" type="checkbox" checked={redaction} onChange={e=> setRedaction(e.target.checked)} />
								<label htmlFor="toggle-redaction" style={{ fontSize:11 }}>Redact Names</label>
							</div>
							<button onClick={()=> { triggerPassiveNow(); setOpen(false); }} style={{ display:'block', width:'100%', textAlign:'center', background:'#375a9e', color:'#fff', border:'1px solid #1e3a8a', padding:'6px 8px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600, margin:'2px 0 8px' }}>Refresh Suggestions Now</button>
							<div style={{ borderTop:'1px solid '+(theme.primary||'#444'), margin:'6px 0 8px' }} />
							<div style={{ fontWeight:'bold', marginBottom:6, fontSize:12 }}>Admin</div>
							{!adminEnabled ? (
								<button onClick={()=>{ try { storage.set('pobIsAdmin','true'); } catch{}; setAdminEnabled(true); setOpen(false); window.location.hash='#admin'; }} style={{ display:'block', width:'100%', textAlign:'left', background: theme.primary, color: theme.text, border:'1px solid '+(theme.secondary||'#222'), padding:'6px 8px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600 }}>Enable Admin Mode</button>
							) : (
								<div style={{ display:'flex', flexDirection:'column', gap:6 }}>
									<a href="#admin" onClick={()=>setOpen(false)} style={{ textDecoration:'none', background: theme.primary, color: theme.text, padding:'6px 8px', borderRadius:6, fontSize:12, fontWeight:600, border:'1px solid '+(theme.secondary||'#222'), textAlign:'center' }}>Admin Panel</a>
									<button onClick={()=>{ if(window.confirm('Disable admin mode?')) { try { storage.remove('pobIsAdmin'); } catch{}; setAdminEnabled(false); if(window.location.hash==='#admin') window.location.hash='#dashboard'; setOpen(false);} }} style={{ background:'#922', color:'#fff', border:'1px solid #b55', padding:'6px 8px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600 }}>Disable Admin</button>
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
