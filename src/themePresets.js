// themePresets.js
// Manual themes: only light and dark
export const themePresets = {
  light: {
    name: 'Light',
    primary: '#388e3c', // darker green for buttons
    secondary: '#2e7031', // even darker green for alternate buttons
    background: '#e0e0e0', // light gray for all objects
    surface: '#e0e0e0', // light gray for chart/table
    text: '#222', // black font
    buttonText: '#bfc4ca', // light gray button text
    border: '#bdbdbd',
    error: '#d32f2f',
  },
  dark: {
    name: 'Dark',
    primary: '#0a174e', // navy blue for accents/buttons
    secondary: '#1976d2', // blue for buttons
    background: '#22223b', // match chart color
    surface: '#22223b', // match chart color
    text: '#bfc4ca', // light gray font
    buttonText: '#fff', // white button text
    border: '#393e46',
    error: '#d32f2f',
  }
};
