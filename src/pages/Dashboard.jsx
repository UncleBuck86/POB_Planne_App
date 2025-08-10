import React, { useMemo, useState } from 'react';
import { useTheme } from '../ThemeContext.jsx';
import styled, { ThemeProvider as StyledThemeProvider, createGlobalStyle } from 'styled-components';

// Reuse theming like planner page
const GlobalStyle = createGlobalStyle`
  body { background: ${({ theme }) => theme.background}; color: ${({ theme }) => theme.text}; transition: background 0.3s, color 0.3s; }
  * { font-family: 'Segoe UI', Arial, sans-serif; }
`;
const GearButton = styled.button`
  position: fixed; top: 12px; right: 16px; background: transparent; border: none; cursor: pointer; z-index: 200; font-size: 24px; color: ${({ theme }) => theme.primary || '#fff'}; line-height: 1; padding: 0; transition: color 0.2s, transform 0.2s;
  &:hover { color: ${({ theme }) => theme.secondary || '#ccc'}; transform: rotate(20deg); }
`;
const Dropdown = styled.div`
  position: fixed; top: 54px; right: 16px; background: ${({ theme }) => theme.background || '#fff'}; color: ${({ theme }) => theme.text || '#222'}; border: 1px solid ${({ theme }) => theme.primary}; border-radius: 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.35); min-width: 200px; padding: 14px 16px 16px; z-index: 210;
`;

function Dashboard() {
  const { theme, team, changeTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const widgetBorderColor = theme.name === 'Dark' ? '#bfc4ca' : '#444';
  // Load stored planner data (non-editable view)
  const rowData = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('pobPlannerData')) || []; } catch { return []; }
  }, []);
  const comments = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('pobPlannerComments')) || {}; } catch { return {}; }
  }, []);
  const today = new Date();
  const next7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return {
      key: (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear(),
      label: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      dow: d.toLocaleDateString('en-US', { weekday: 'short' })
    };
  });
  const visibleCompanies = rowData.filter(r => r.company && r.company.trim());
  const hasComments = useMemo(() => next7.some(d => (comments[d.key] || '').trim().length > 0), [comments, next7]);
  const totalsPerDay = next7.reduce((acc, d) => {
    acc[d.key] = visibleCompanies.reduce((sum, c) => sum + (parseInt(c[d.key], 10) || 0), 0);
    return acc;
  }, {});
  return (
    <StyledThemeProvider theme={theme}>
      <GlobalStyle />
  <div style={{ padding: '24px', color: theme.text }}>
        <GearButton onClick={() => setSettingsOpen(o => !o)} title="Settings / Theme">⚙️</GearButton>
        {settingsOpen && (
          <Dropdown>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>Theme Settings</div>
            <label htmlFor="dash-theme-select" style={{ marginRight: 8 }}>Select Theme:</label>
            <select id="dash-theme-select" value={team} onChange={e => { changeTheme(e.target.value); setSettingsOpen(false); }}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Dropdown>
        )}
  <h2 style={{ marginTop: 0, color: team === 'dark' ? theme.text : theme.primary }}>Dashboard</h2>
  <section style={{ margin: '16px 0 24px', padding: '12px 16px', background: theme.surface, border: '1px solid #bfc4ca', borderRadius: 8 }}>
  <h3 style={{ margin: '0 0 8px', color: team === 'dark' ? theme.text : theme.secondary }}>Navigation</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <li><a href="#planner" style={{ color: theme.text, fontWeight: 'bold', textDecoration: 'none' }}>Go to Planner</a></li>
        </ul>
      </section>
      <p style={{ maxWidth: 640, lineHeight: 1.5 }}>
        This is the new dashboard page. Add summary widgets (e.g., total POB, upcoming flights,
        company highlights) here. Let me know what metrics or charts you want to surface first.
      </p>
  <section style={{ marginTop: 16, padding: '6px 8px', background: theme.surface, border: `1px solid ${widgetBorderColor}`, borderRadius: 8, display: 'inline-block' }}>
  <h3 style={{ margin: '0 0 4px', color: theme.text, fontSize: 16 }}>POB Forecast</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: 'auto', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={thStyle(theme, hasComments)}>Company</th>
                {next7.map(d => {
                  const header = `${d.dow} ${d.label}`; // single-line compact
                  return (
                    <th key={d.key} style={thStyle(theme, hasComments)} title={d.key}>{header}</th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visibleCompanies.map(c => (
                <tr key={c.id || c.company}>
                  <td style={tdLeft(theme)}>{c.company}</td>
                  {next7.map(d => (
                    <td key={d.key} style={tdStyle(theme)}>{c[d.key] || ''}</td>
                  ))}
                </tr>
              ))}
              <tr style={{ background: theme.background }}>
                <td style={{ ...tdLeft(theme), fontWeight: 'bold', fontSize: 13 }}>Totals</td>
                {next7.map(d => (
                  <td key={d.key} style={{ ...tdStyle(theme), fontWeight: 'bold', fontSize: 11 }}>{totalsPerDay[d.key] || ''}</td>
                ))}
              </tr>
              <tr>
                <td style={{ ...tdLeft(theme), fontStyle: 'italic', fontSize: 13 }}>Comments</td>
                {next7.map(d => (
                  <td key={d.key} style={{ ...tdStyle(theme), fontStyle: 'italic', whiteSpace: 'pre-wrap', fontSize: 10 }}>{comments[d.key] || ''}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
  <div style={{ marginTop: 4, fontSize: 11, opacity: 0.6 }}>Read-only snapshot.</div>
      </section>
      </div>
    </StyledThemeProvider>
  );
}

export default Dashboard;

// Styling helpers
const thStyle = (theme, hasComments) => {
  const borderColor = theme.name === 'Dark' ? '#bfc4ca' : '#444';
  return {
    padding: '3px 4px',
    border: `1px solid ${borderColor}`,
    background: theme.primary,
    color: theme.text,
    fontSize: 10,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    width: 'auto'
  };
};
const tdStyle = (theme) => {
  const borderColor = theme.name === 'Dark' ? '#bfc4ca40' : '#444';
  return {
    padding: '2px 4px',
    border: `1px solid ${borderColor}`,
    fontSize: 10,
    textAlign: 'center'
  };
};
const tdLeft = (theme) => ({
  ...tdStyle(theme),
  textAlign: 'left',
  fontWeight: 500,
  maxWidth: 120,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
});
