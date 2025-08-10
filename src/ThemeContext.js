
// ThemeContext.js
// Provides theme state and switching for the app
import React, { createContext, useContext, useState } from 'react';
import { nflThemes } from './themePresets';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(nflThemes['49ers']); // Default theme
  const [team, setTeam] = useState('49ers');

  const changeTheme = (teamName) => {
    setTeam(teamName);
    setTheme(nflThemes[teamName] || nflThemes['49ers']);
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
