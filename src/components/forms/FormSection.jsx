import React from 'react';
import { useTheme } from '../../ThemeContext.jsx';

export default function FormSection({ title, children, right, style }) {
  const { theme } = useTheme();
  return (
    <section style={{ background: theme.surface, border:'1px solid '+(theme.name==='Dark'? '#555':'#ccc'), borderRadius:12, padding:'16px 18px 20px', marginBottom:28, boxShadow:'0 4px 12px rgba(0,0,0,0.25)', ...style }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontSize:16, fontWeight:800 }}>{title}</div>
        {right}
      </div>
      {children}
    </section>
  );
}
