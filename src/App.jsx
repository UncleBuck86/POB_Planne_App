import React, { useState, useEffect, useRef, useState as useReactState } from 'react';
import styled, { ThemeProvider as StyledThemeProvider, createGlobalStyle } from 'styled-components';
import CompanyTable from './components/CompanyTable';
import { generateFlightComments } from './utils/generateFlightComment';
import { getAllDates, formatDate } from './utils/dateUtils';
import { ThemeProvider, useTheme } from './ThemeContext.jsx';
import { themePresets } from './themePresets';

const today = new Date();
const allDates = getAllDates(today.getFullYear());
const todayStr = formatDate(today);

const defaultStart = new Date(today);
defaultStart.setDate(defaultStart.getDate() - 7);

const defaultEnd = new Date(today);
defaultEnd.setDate(defaultEnd.getDate() + 28);

const defaultStartStr = defaultStart.toISOString().split('T')[0];
const defaultEndStr = defaultEnd.toISOString().split('T')[0];

const initialPobData = [
  { company: 'Operations', '8/7/2025': 19, '8/8/2025': 21, '8/9/2025': 23, '8/10/2025': 23 },
  { company: 'ABS' },
  { company: 'Audubon', '8/8/2025': 1, '8/9/2025': 1, '8/10/2025': 1 },
  { company: 'Baileys', '8/7/2025': 3, '8/8/2025': 3, '8/9/2025': 3, '8/10/2025': 3 },
  { company: 'BH Energy', '8/7/2025': 3, '8/8/2025': 3, '8/9/2025': 3, '8/10/2025': 3 },
];

const comments = {
  '8/9/2025': 'Ops-Trey P and Taylor S',
  '8/10/2025': 'Ops-Hayden T and Wendel K. Linear - Kent P headed in, Jared B Staying Out, Shell out to prove LACT',
};

function ThemeSelector() {
  const { team, changeTheme } = useTheme();
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor="theme-select" style={{ marginRight: 8 }}>Select Theme:</label>
      <select id="theme-select" value={team} onChange={e => changeTheme(e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
 

const GearButton = styled.button`
  position: fixed;
  top: 16px;
  left: 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  z-index: 100;
  font-size: 24px;
  color: ${({ theme }) => theme.primary || '#222'};
`;

const Dropdown = styled.div`
  position: absolute;
  top: 40px;
  left: 0;
  background: ${({ theme }) => theme.background || '#fff'};
  color: ${({ theme }) => theme.text || '#222'};
  border: 1px solid #ccc;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  min-width: 180px;
  padding: 12px;
`;

const GlobalStyle = createGlobalStyle`
  body {
    background: ${({ theme }) => theme.background};
    color: ${({ theme }) => theme.text};
    transition: background 0.3s, color 0.3s;
  }
  * {
    font-family: 'Segoe UI', Arial, sans-serif;
  }
`;

function ThemeConsumerWrapper(props) {
  const { theme } = useTheme();
  return (
    <StyledThemeProvider theme={theme}>
      <GlobalStyle />
      <AppContent {...props} />
    </StyledThemeProvider>
  );
}

function AppContent(props) {
  const { theme, team, changeTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useReactState(false);
  const [editingCompanies, setEditingCompanies] = useState(false);
  const handleReset = () => {
    setViewStart(defaultStartStr);
    setViewEnd(defaultEndStr);
  };
  const [rowData, setRowData] = useState(() => {
    const saved = localStorage.getItem('pobPlannerData');
    return saved ? JSON.parse(saved) : initialPobData;
  });
  const [commentsState, setCommentsState] = useState(() => {
    const saved = localStorage.getItem('pobPlannerComments');
    return saved ? JSON.parse(saved) : comments;
  });

  const [flightsOut, setFlightsOut] = useState({});
  const [flightsIn, setFlightsIn] = useState({});

  const [viewStart, setViewStart] = useState(defaultStartStr);
  const [viewEnd, setViewEnd] = useState(defaultEndStr);
  const todayColumnRef = useRef(null);

  const visibleDates = allDates.filter(d => {
    const dateObj = new Date(d.date);
    return dateObj >= new Date(viewStart) && dateObj <= new Date(viewEnd);
  });

  useEffect(() => {
    const { flightsOut, flightsIn } = generateFlightComments(rowData, visibleDates);
    setFlightsOut(flightsOut);
    setFlightsIn(flightsIn);
  }, [rowData, visibleDates]);

  useEffect(() => {
    setTimeout(() => {
      if (todayColumnRef.current) {
        todayColumnRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }
    }, 300);
  }, [viewStart, viewEnd]);

  return (
    <div style={{ background: team === 'dark' ? '#22223b' : theme.background, color: theme.text, minHeight: '100vh' }}>
      <GearButton theme={theme} onClick={() => setSettingsOpen(o => !o)} title="Settings">
        <span role="img" aria-label="settings">⚙️</span>
      </GearButton>
      {settingsOpen && (
        <Dropdown theme={theme}>
          <div style={{ marginBottom: 8, fontWeight: 'bold' }}>Theme Settings</div>
          <label htmlFor="theme-select" style={{ marginRight: 8 }}>Select Theme:</label>
          <select id="theme-select" value={team} onChange={e => { changeTheme(e.target.value); setSettingsOpen(false); }}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <hr style={{ margin: '12px 0' }} />
          <button
            onClick={() => { setEditingCompanies(true); setSettingsOpen(false); }}
            style={{ width: '100%', padding: '8px', background: theme.primary, color: theme.buttonText || theme.text, border: 'none', borderRadius: 4, fontWeight: 'bold', marginTop: 8 }}
          >
            Edit Companies
          </button>
        </Dropdown>
      )}
      <div style={{ position: 'fixed', top: 10, left: 60, color: 'yellow', fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px', textShadow: '0 0 4px rgba(0,0,0,0.6)' }}>
        v2.0
      </div>
      <h1 style={{ 
        color: team === 'light' ? '#bfc4ca' : team === 'dark' ? '#bfc4ca' : theme.primary,
        background: team === 'dark' ? theme.background : theme.secondary,
        padding: '24px 0 8px 0',
        textAlign: 'center',
        fontFamily: team === 'dark' ? 'Arial Black, Arial, sans-serif' : 'Segoe UI, Arial, sans-serif',
        textShadow: team === 'dark' ? '0 2px 8px #000' : 'none',
        borderBottom: `2px solid ${theme.primary}`
      }}>
        POB Planning and Scheduling
      </h1>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '1rem', 
        flexWrap: 'wrap', 
        marginBottom: '1rem',
        background: team === 'dark' ? theme.background : theme.secondary,
        borderRadius: '8px',
        padding: '8px 0'
      }}>
        <div>
          <label style={{ color: team === 'light' ? '#bfc4ca' : theme.text, fontWeight: 'bold' }}>Start Date: </label>
          <input
            type='date'
            value={viewStart}
            onChange={e => setViewStart(e.target.value)}
            style={{ background: team === 'dark' ? theme.background : theme.background, color: theme.text, border: `1px solid ${theme.primary}`, borderRadius: '4px', padding: '2px 6px' }}
          />
        </div>
        <div>
          <label style={{ color: team === 'light' ? '#bfc4ca' : theme.text, fontWeight: 'bold' }}>End Date: </label>
          <input
            type='date'
            value={viewEnd}
            onChange={e => setViewEnd(e.target.value)}
            style={{ background: team === 'dark' ? theme.background : theme.background, color: theme.text, border: `1px solid ${theme.primary}`, borderRadius: '4px', padding: '2px 6px' }}
          />
        </div>
        <button onClick={handleReset} style={{ padding: '6px 12px', background: theme.primary, color: theme.background === '#222831' ? '#fff' : theme.text, borderRadius: '4px', fontWeight: 'bold', border: `1px solid ${theme.secondary}` }}>
          Reset View
        </button>
      </div>
      <CompanyTable
        rowData={rowData}
        setRowData={setRowData}
        dates={visibleDates}
        flightsOut={flightsOut}
        flightsIn={flightsIn}
        comments={commentsState}
        setComments={setCommentsState}
        todayColumnRef={todayColumnRef}
        themeOverride={team === 'dark' ? { background: '#0a174e' } : {}}
        editing={editingCompanies}
        setEditing={setEditingCompanies}
      />
    </div>
  );
}

const App = (props) => (
  <ThemeProvider>
    <ThemeConsumerWrapper {...props} />
  </ThemeProvider>
);

export default App;

