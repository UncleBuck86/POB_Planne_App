// ThemeContext.jsx
// Provides theme state and switching for the app
import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from './utils/storageAdapter';
import { themePresets } from './themePresets';

const ThemeContext = createContext();


export function ThemeProvider({ children }) {
  // Initialize from localStorage if present
  const initialTeam = storage.get('pobTheme') || 'light';
  const [team, setTeam] = useState(initialTeam);
  const [theme, setTheme] = useState(themePresets[initialTeam] || themePresets['light']);
  const initialDensity = storage.get('pobDensity') || 'comfort';
  const [density, setDensity] = useState(initialDensity);
  const initialDateFormat = storage.get('pobDateFormat') || 'mdy';
  const [dateFormat, setDateFormat] = useState(initialDateFormat);
  const initialReadOnly = storage.getBool('pobReadOnly', false);
  const [readOnly, setReadOnly] = useState(initialReadOnly);

  const changeTheme = (themeName) => {
    const next = themePresets[themeName] ? themeName : 'light';
    setTeam(next);
    setTheme(themePresets[next]);
  storage.set('pobTheme', next);
  };

  const changeDensity = (d) => {
    const next = (d === 'compact' || d === 'comfort') ? d : 'comfort';
    setDensity(next);
  storage.set('pobDensity', next);
  };

  const changeDateFormat = (fmt) => {
    const next = (fmt === 'dmy' || fmt === 'mdy' || fmt === 'iso') ? fmt : 'mdy';
    setDateFormat(next);
  storage.set('pobDateFormat', next);
  };

  const changeReadOnly = (val) => {
    const next = !!val;
    setReadOnly(next);
  storage.setBool('pobReadOnly', next);
  };

  // Keep localStorage in sync if team changes from elsewhere
  useEffect(() => { storage.set('pobTheme', team); }, [team]);

  // Keep density in sync
  useEffect(() => { storage.set('pobDensity', density); }, [density]);

  // Keep dateFormat in sync
  useEffect(() => { storage.set('pobDateFormat', dateFormat); }, [dateFormat]);

  // Keep readOnly in sync
  useEffect(() => { storage.setBool('pobReadOnly', readOnly); }, [readOnly]);

  return (
  <ThemeContext.Provider value={{ theme, team, changeTheme, density, changeDensity, dateFormat, changeDateFormat, readOnly, changeReadOnly }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
