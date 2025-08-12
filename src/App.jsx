import React, { useState, useEffect, useRef } from 'react';
import styled, { ThemeProvider as StyledThemeProvider, createGlobalStyle } from 'styled-components';
import CompanyTable from './components/CompanyTable';
import { generateFlightComments } from './helpers/commentHelpers';
import { getAllDates } from './services/dateService';
import { formatDate } from './helpers/dateHelpers';
import { useTheme } from './ThemeContext.jsx';
import { themePresets } from './themePresets';
import { initialPobData, initialPobComments } from './data/seed.js';

const today = new Date();
const allDates = getAllDates(today.getFullYear());
const todayStr = formatDate(today); // YYYY-MM-DD
const todayKey = (today.getMonth()+1) + '/' + today.getDate() + '/' + today.getFullYear(); // matches table date keys

const defaultStart = new Date(today); // start at today
const defaultEnd = new Date(today);   // end at today + 28
defaultEnd.setDate(defaultEnd.getDate() + 28);

const defaultStartStr = defaultStart.toISOString().split('T')[0];
const defaultEndStr = defaultEnd.toISOString().split('T')[0];

// Seed data moved to data/seed.js

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
 

// Removed individual gear button / dropdown (now unified in global nav)

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
  const { theme, team } = useTheme();
  const [editingCompanies, setEditingCompanies] = useState(false);
  const handleReset = () => {
    setViewStart(defaultStartStr);
    setViewEnd(defaultEndStr);
  };
  const [rowData, setRowData] = useState(() => {
    try {
      const saved = localStorage.getItem('pobPlannerData');
      return saved ? JSON.parse(saved) : initialPobData;
    } catch { return initialPobData; }
  });
  const [commentsState, setCommentsState] = useState(() => {
    try {
      const saved = localStorage.getItem('pobPlannerComments');
      return saved ? JSON.parse(saved) : initialPobComments;
    } catch { return initialPobComments; }
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
  // Listen for global event to open Edit Companies from unified gear
  useEffect(()=>{
    const handler = () => setEditingCompanies(true);
    window.addEventListener('openPlannerEditCompanies', handler);
    return () => window.removeEventListener('openPlannerEditCompanies', handler);
  },[]);

  return (
  <div style={{ background: team === 'dark' ? theme.background : theme.background, color: theme.text, minHeight: '100vh' }}>
  {/* Unified settings handled by global nav gear */}
      <div style={{ position: 'fixed', top: 10, left: 60, color: 'yellow', fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px', textShadow: '0 0 4px rgba(0,0,0,0.6)' }}>
  v5.1
      </div>
      <h1 style={{ 
        color: team === 'dark' ? theme.text : theme.primary,
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
          <label style={{ color: theme.text, fontWeight: 'bold' }}>Start Date: </label>
          <input
            type='date'
            value={viewStart}
            onChange={e => setViewStart(e.target.value)}
            style={{ background: team === 'dark' ? theme.background : theme.background, color: theme.text, border: `1px solid ${theme.primary}`, borderRadius: '4px', padding: '2px 6px' }}
          />
        </div>
        <div>
          <label style={{ color: theme.text, fontWeight: 'bold' }}>End Date: </label>
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
        todayKey={todayKey}
  viewStart={viewStart}
  viewEnd={viewEnd}
  themeOverride={team === 'dark' ? { background: theme.surface } : {}}
        editing={editingCompanies}
        setEditing={setEditingCompanies}
      />
    </div>
  );
}

export default ThemeConsumerWrapper;

