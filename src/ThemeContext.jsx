// ThemeContext.jsx
// Provides theme state and switching for the app
import React, { createContext, useContext, useState, useEffect } from 'react';
import { themePresets } from './themePresets';

const ThemeContext = createContext();


export function ThemeProvider({ children }) {
  // Initialize from localStorage if present
  const initialTeam = (() => {
    try { return localStorage.getItem('pobTheme') || 'light'; } catch { return 'light'; }
  })();
  const [team, setTeam] = useState(initialTeam);
  const [theme, setTheme] = useState(themePresets[initialTeam] || themePresets['light']);

  const changeTheme = (themeName) => {
    const next = themePresets[themeName] ? themeName : 'light';
    setTeam(next);
    setTheme(themePresets[next]);
    try { localStorage.setItem('pobTheme', next); } catch {/* ignore */}
  };

  // Keep localStorage in sync if team changes from elsewhere
  useEffect(() => {
    try { localStorage.setItem('pobTheme', team); } catch {/* ignore */}
  }, [team]);

  return (
    <ThemeContext.Provider value={{ theme, team, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
