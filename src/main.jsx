import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Personnel from './pages/Personnel.jsx';
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
	else content = <Dashboard />;
	return (
		<ThemeProvider>
			<div style={{ minHeight: '100vh' }}>
				<nav style={{ display: 'flex', gap: 12, padding: '8px 16px', borderBottom: '1px solid #444', background: '#111', position: 'sticky', top: 0, zIndex: 50 }}>
					<a href="#dashboard" style={{ color: page === 'dashboard' ? 'yellow' : '#fff', fontWeight: 'bold', textDecoration: 'none' }}>Dashboard</a>
					<a href="#planner" style={{ color: page === 'planner' ? 'yellow' : '#fff', fontWeight: 'bold', textDecoration: 'none' }}>Planner</a>
					<a href="#personnel" style={{ color: page === 'personnel' ? 'yellow' : '#fff', fontWeight: 'bold', textDecoration: 'none' }}>Personnel</a>
				</nav>
				{content}
			</div>
		</ThemeProvider>
	);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<RootRouter />);
