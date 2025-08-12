import React from 'react';
import { createGlobalStyle } from 'styled-components';
import { useTheme } from './ThemeContext.jsx';

const Base = createGlobalStyle`
  :root {
    --focus-ring: #2d6cdf;
    --focus-ring-dark: #9ec1ff;
    --font-body: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
  --density: ${props => props.$density === 'compact' ? 0.9 : 1};
  }
  html { font-size: 16px; }
  body {
    margin: 0;
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  background: ${(props) => (props.theme && props.theme.background) || 'transparent'};
  color: ${(props) => (props.theme && props.theme.text) || 'inherit'};
  }
  *:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 2px;
  }
  @media (prefers-color-scheme: dark){
    *:focus-visible { outline-color: var(--focus-ring-dark); }
  }
  button, input, select, textarea { line-height: calc(1.2 * var(--density)); }
  button, input, select { padding: calc(8px * var(--density)) calc(10px * var(--density)); }
  /* Subtle cards/panels */
  .card, .panel {
    background: ${(props) => (props.theme && props.theme.surface) || '#fff'};
    border: 1px solid ${(props) => (props.theme && props.theme.border) || '#e5e7eb'};
    border-radius: 8px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  /* Muted table headers */
  th {
    background: ${(props) => (props.theme && props.theme.surface) || '#f9fafb'};
  }

  /* Print styles */
  @media print {
    @page { margin: 12mm; }
    html, body { background: #fff !important; color: #000 !important; }
    nav { display: none !important; }
    .no-print, [data-print='hide'] { display: none !important; }
    .card, .panel, section { box-shadow: none !important; border-color: #00000033 !important; background: #fff !important; }
    table { font-size: 11px !important; }
    th { background: #eee !important; color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr, td, th { break-inside: avoid; page-break-inside: avoid; }
    .print-break-before { break-before: page; page-break-before: always; }
    .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
  }
`;

export default function GlobalStyle() {
  const { density } = useTheme() || { density: 'comfort' };
  return <Base $density={density} />;
}
