// PlannerDirect.jsx - page wrapping the simplified direct planner table
import React from 'react';
import CompanyTableDirect from '../components/CompanyTableDirect.jsx';
import { useTheme } from '../ThemeContext.jsx';

export default function PlannerDirectPage() {
  const { theme } = useTheme();
  return (
    <div style={{ padding:16, color:theme.text }}>
      <h2 style={{ margin:'0 0 8px' }}>Planner (Direct Comparison)</h2>
      <p style={{ fontSize:12, opacity:.7, margin:'0 0 16px' }}>
        This version renders the planner table directly on the page (no internal frame / auto-fit logic)
        so you can compare performance and layout with the original.
      </p>
      <CompanyTableDirect />
    </div>
  );
}
