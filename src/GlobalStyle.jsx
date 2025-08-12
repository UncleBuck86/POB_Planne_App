import React from 'react';
import { createGlobalStyle } from 'styled-components';
import { useTheme } from './ThemeContext.jsx';

const Base = createGlobalStyle`
  :root {
    --focus-ring: #2d6cdf;
    --focus-ring-dark: #9ec1ff;
    --font-body: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
  }
  html { font-size: 16px; }
  body {
    margin: 0;
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }
  *:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 2px;
  }
  @media (prefers-color-scheme: dark){
    *:focus-visible { outline-color: var(--focus-ring-dark); }
  }
`;

export default function GlobalStyle() {
  // Could adapt CSS vars by theme if needed later
  useTheme();
  return <Base />;
}
