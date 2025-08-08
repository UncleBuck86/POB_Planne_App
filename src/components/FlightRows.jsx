import React from 'react';

export default function FlightRows({ flightsOut, flightsIn, dates }) {
  return (
    <div style={{ marginTop: 20 }}>
      <h3>Flights: Personnel Out</h3>
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
              <td key={d.date}>{flightsOut[d.date]?.join(', ') || ''}</td>
            ))}
          </tr>
        </tbody>
      </table>

      <h3>Flights: Personnel In</h3>
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
              <td key={d.date}>{flightsIn[d.date]?.join(', ') || ''}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}