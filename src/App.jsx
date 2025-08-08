import React, { useState, useEffect, useRef } from 'react';
import CompanyTable from './components/CompanyTable';
import { generateFlightComments } from './utils/flightAutoComment';
import { getAllDates, formatDate } from './utils/dateUtils';

const today = new Date();
const allDates = getAllDates(today.getFullYear());
const todayStr = formatDate(today);

const defaultStart = new Date(today);
defaultStart.setDate(defaultStart.getDate() - 7);

const defaultEnd = new Date(today);
defaultEnd.setDate(defaultEnd.getDate() + 28);

const defaultStartStr = defaultStart.toISOString().split('T')[0];
const defaultEndStr = defaultEnd.toISOString().split('T')[0];

const initialPobData = [
  { company: 'Operations', '8/7/2025': 19, '8/8/2025': 21, '8/9/2025': 23, '8/10/2025': 23 },
  { company: 'ABS' },
  { company: 'Audubon', '8/8/2025': 1, '8/9/2025': 1, '8/10/2025': 1 },
  { company: 'Baileys', '8/7/2025': 3, '8/8/2025': 3, '8/9/2025': 3, '8/10/2025': 3 },
  { company: 'BH Energy', '8/7/2025': 3, '8/8/2025': 3, '8/9/2025': 3, '8/10/2025': 3 },
];

const comments = {
  '8/9/2025': 'Ops-Trey P and Taylor S',
  '8/10/2025': 'Ops-Hayden T and Wendel K. Linear - Kent P headed in, Jared B Staying Out, Shell out to prove LACT',
};

export default function App() {
  const [rowData, setRowData] = useState(() => {
    const saved = localStorage.getItem('pobPlannerData');
    return saved ? JSON.parse(saved) : initialPobData;
  });
  const [commentsState, setCommentsState] = useState(() => {
    const saved = localStorage.getItem('pobPlannerComments');
    return saved ? JSON.parse(saved) : comments;
  });

  const [viewStart, setViewStart] = useState(defaultStartStr);
  const [viewEnd, setViewEnd] = useState(defaultEndStr);
  const todayColumnRef = useRef(null);

  const visibleDates = allDates.filter(d => {
    const dateObj = new Date(d.date);
    return dateObj >= new Date(viewStart) && dateObj <= new Date(viewEnd);
  });

  const { flightsOut, flightsIn } = generateFlightComments(rowData, visibleDates);

  useEffect(() => {
    setTimeout(() => {
      if (todayColumnRef.current) {
        todayColumnRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }
    }, 300);
  }, [viewStart, viewEnd]);

  const handleReset = () => {
    setViewStart(defaultStartStr);
    setViewEnd(defaultEndStr);
  };

  return (
    <div style={{ background: '#888', minHeight: '100vh', padding: 0, margin: 0 }}>
      <div style={{ position: 'fixed', top: 10, left: 20, color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
        v1.0.0
      </div>
      <h1 style={{ color: '#fff', padding: '24px 0 8px 0', textAlign: 'center' }}>POB Planning and Scheduling</h1>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <label style={{ color: 'white' }}>Start Date: </label>
          <input
            type='date'
            value={viewStart}
            onChange={e => setViewStart(e.target.value)}
          />
        </div>
        <div>
          <label style={{ color: 'white' }}>End Date: </label>
          <input
            type='date'
            value={viewEnd}
            onChange={e => setViewEnd(e.target.value)}
          />
        </div>
        <button onClick={handleReset} style={{ padding: '6px 12px', background: '#222', color: 'white', borderRadius: '4px' }}>
          Reset View
        </button>
      </div>
      <CompanyTable
        rowData={rowData}
        setRowData={setRowData}
        dates={visibleDates}
        flightsOut={flightsOut}
        flightsIn={flightsIn}
        comments={commentsState}
        setComments={setCommentsState}
        todayColumnRef={todayColumnRef}
      />
    </div>
  );
}
