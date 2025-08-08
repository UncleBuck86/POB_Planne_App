import React from 'react';

export default function TotalCounts({ totalDailyPOB, dates }) {
  return (
    <div style={{ marginTop: 20 }}>
      <h3>Total Daily POB</h3>
      <table border="1" cellPadding="6">
        <thead>
          <tr>
            {dates.map(d => (
              <th key={d.date}>{d.date}</th>
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