import React from 'react';
import { formatByPreference } from '../utils/dateUtils.js';
import { useTheme } from '../ThemeContext.jsx';

export default function TotalCounts({ totalDailyPOB, dates }) {
  const { dateFormat } = useTheme();
  return (
    <div style={{ marginTop: 20 }}>
      <h3>Total Daily POB</h3>
      <table border="1" cellPadding="6">
        <thead>
          <tr>
            {dates.map(d => (
              <th key={d.date}>{formatByPreference(d.date, dateFormat)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {dates.map(d => (
              <td key={d.date}>{totalDailyPOB[d.date] || ''}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}