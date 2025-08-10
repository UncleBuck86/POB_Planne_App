import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Personnel from './pages/Personnel.jsx';
import Logistics from './pages/Logistics.jsx';
import { ThemeProvider } from './ThemeContext.jsx';

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
	else if (page.startsWith('logistics')) content = <Logistics />;
	else content = <Dashboard />;
	return (
		<ThemeProvider>
			<div style={{ minHeight: '100vh' }}>
				<nav style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 18px 4px', borderBottom: '3px solid #222', background: '#111', position: 'sticky', top: 0, zIndex: 50 }}>
					{[
						{ key: 'dashboard', label: 'Dashboard', color: '#2d6cdf' },
						{ key: 'planner', label: 'Planner', color: '#7a3cc2' },
						{ key: 'personnel', label: 'Personnel', color: '#c2571d' },
						{ key: 'logistics', label: 'Logistics', color: '#198a5a' }
					].map(tab => {
						const active = page === tab.key;
						return (
							<a
								key={tab.key}
								href={'#' + tab.key}
								style={{
									display: 'inline-block',
									padding: '10px 18px 8px',
									fontWeight: 600,
									fontSize: 15,
									letterSpacing: '.5px',
									textDecoration: 'none',
									color: '#fff',
									background: tab.color,
									borderTopLeftRadius: 8,
									borderTopRightRadius: 8,
									boxShadow: active ? '0 0 0 1px #000, 0 2px 4px rgba(0,0,0,.4)' : '0 0 0 1px #000',
									position: 'relative',
									transform: active ? 'translateY(0)' : 'translateY(4px)',
									transition: 'transform .2s, box-shadow .2s, filter .2s',
									filter: active ? 'brightness(1)' : 'brightness(.85)',
									border: '1px solid #000',
									borderBottom: active ? '3px solid #111' : '1px solid #000'
								}}
								onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1)'}
								onMouseLeave={e => e.currentTarget.style.filter = active ? 'brightness(1)' : 'brightness(.85)'}
							>
								{tab.label}
							</a>
						);
					})}
				</nav>
				{content}
			</div>
		</ThemeProvider>
	);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<RootRouter />);
