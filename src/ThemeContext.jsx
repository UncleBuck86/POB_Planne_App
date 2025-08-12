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
  const initialDensity = (() => {
    try { return localStorage.getItem('pobDensity') || 'comfort'; } catch { return 'comfort'; }
  })();
  const [density, setDensity] = useState(initialDensity);
  const initialDateFormat = (() => {
    try { return localStorage.getItem('pobDateFormat') || 'mdy'; } catch { return 'mdy'; }
  })();
  const [dateFormat, setDateFormat] = useState(initialDateFormat);

  const changeTheme = (themeName) => {
    const next = themePresets[themeName] ? themeName : 'light';
    setTeam(next);
    setTheme(themePresets[next]);
    try { localStorage.setItem('pobTheme', next); } catch {/* ignore */}
  };

  const changeDensity = (d) => {
    const next = (d === 'compact' || d === 'comfort') ? d : 'comfort';
    setDensity(next);
    try { localStorage.setItem('pobDensity', next); } catch {/* ignore */}
  };

  const changeDateFormat = (fmt) => {
    const next = (fmt === 'dmy' || fmt === 'mdy' || fmt === 'iso') ? fmt : 'mdy';
    setDateFormat(next);
    try { localStorage.setItem('pobDateFormat', next); } catch {/* ignore */}
  };

  // Keep localStorage in sync if team changes from elsewhere
  useEffect(() => {
    try { localStorage.setItem('pobTheme', team); } catch {/* ignore */}
  }, [team]);

  // Keep density in sync
  useEffect(() => {
    try { localStorage.setItem('pobDensity', density); } catch {/* ignore */}
  }, [density]);

  // Keep dateFormat in sync
  useEffect(() => {
    try { localStorage.setItem('pobDateFormat', dateFormat); } catch {/* ignore */}
  }, [dateFormat]);

  return (
    <ThemeContext.Provider value={{ theme, team, changeTheme, density, changeDensity, dateFormat, changeDateFormat }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
