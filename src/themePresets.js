// themePresets.js
// Manual themes: only light and dark
export const themePresets = {
  light: {
    name: 'Light',
  // Softer, lower-glare palette
  primary: '#2f7d4d', // muted green
  secondary: '#2a6a44',
  background: '#eef2f5', // soft neutral background
  surface: '#f3f5f7', // low-glare surface for tables/cards
  text: '#1f2937', // slate-800
  buttonText: '#ffffff', // high-contrast on primary
  border: '#cfd8e3',
  error: '#c0392b',
  },
  dark: {
    name: 'Dark',
  // Reduced contrast dark to avoid bloom on bright elements
  primary: '#2b4e7c', // softened navy
  secondary: '#3a76ad',
  background: '#1f2430',
  surface: '#1f2430',
  text: '#cdd6df',
  buttonText: '#ffffff',
  border: '#323846',
  error: '#f05a5a',
  }
};
