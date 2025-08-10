// ThemeContext.jsx
// Provides theme state and switching for the app
import React, { createContext, useContext, useState } from 'react';
import { themePresets } from './themePresets';

const ThemeContext = createContext();


export function ThemeProvider({ children }) {
  const [team, setTeam] = useState('light');
  const [theme, setTheme] = useState(themePresets['light']);

  const changeTheme = (themeName) => {
    setTeam(themeName);
    setTheme(themePresets[themeName] || themePresets['light']);
  };

  return (
    <ThemeContext.Provider value={{ theme, team, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
