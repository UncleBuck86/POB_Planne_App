import React from 'react';
import { useTheme } from '../../ThemeContext.jsx';

export default function Field({ label, children, full, required, error, help, style }) {
  const { theme } = useTheme();
  const labelStyle = {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '.5px',
    fontWeight: 700,
    opacity: .8,
    marginBottom: 4,
  };
  const errColor = theme.name === 'Dark' ? '#ff9aa2' : '#b00020';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, ...(full ? { gridColumn: '1 / -1' } : {}), ...style }}>
      {label && (
        <span style={labelStyle}>
          {label}
          {required ? <span style={{ color: errColor }}> *</span> : null}
        </span>
      )}
      {children}
      {help && <span style={{ fontSize: 11, opacity: .65 }}>{help}</span>}
      {error && <span style={{ fontSize: 11, color: errColor }}>{error}</span>}
    </label>
  );
}
