import React, { useState } from 'react';
import CompanyTable from './components/CompanyTable';
import FlightRows from './components/FlightRows';
import TotalCounts from './components/TotalCounts';
import { generateFlightComments } from './utils/flightAutoComment';

function getAllDates(year) {
  const dates = [];
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
    dates.push({ date: dateStr, day: dayStr });
  }
  return dates;
}

const dates = getAllDates(2025);

const initialPobData = [
  { company: 'Operations', '8/7/2025': 19, '8/8/2025': 21, '8/9/2025': 23, '8/10/2025': 23 },
  { company: 'ABS' },
  { company: 'Audubon', '8/8/2025': 1, '8/9/2025': 1, '8/10/2025': 1 },
  { company: "Bailey's", '8/7/2025': 3, '8/8/2025': 3, '8/9/2025': 3, '8/10/2025': 3 },
  { company: 'BH Energy', '8/7/2025': 3, '8/8/2025': 3, '8/9/2025': 3, '8/10/2025': 3 },
  // ...add other companies as needed
];

const totalDailyPOB = { '8/7/2025': 56, '8/8/2025': 58, '8/9/2025': 56, '8/10/2025': 48 };

const flightsOut = {
  '8/7/2025': ['1-MPM'],
  '8/8/2025': ['2-Operations', '1-Audubon', '1-NOV Gary L.'],
  '8/9/2025': ['1-Champion X', '2-Operations', '1-Danos Adam T'],
};

const flightsIn = {
  '8/7/2025': ['1-Innomotics', '1-Milestone'],
  '8/8/2025': ['1-Solar', '1-Danos - 3rd Party'],
  '8/9/2025': ['1-NOV', '1-TFMC', '2-W-Ind', '1-Pinnacle', '1-MPM'],
};

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
  // Show only 30 days starting from today
  const today = new Date();
  const todayStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
  const startIdx = dates.findIndex(d => d.date === todayStr);
  const visibleDates = dates.slice(startIdx, startIdx + 30);

  // Auto-generate flightsOut and flightsIn
  const { flightsOut, flightsIn } = generateFlightComments(rowData, visibleDates);

  return (
    <div style={{ background: '#888', minHeight: '100vh', padding: 0, margin: 0 }}>
      <div style={{ background: 'yellow', color: 'black', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>
        DEBUG: App is rendering!
      </div>
      <h1 style={{ color: '#fff', padding: '24px 0 8px 0', textAlign: 'center' }}>POB Planning and Scheduling</h1>
         <CompanyTable
           rowData={rowData}
           setRowData={setRowData}
           dates={visibleDates}
           flightsOut={flightsOut}
           flightsIn={flightsIn}
           comments={commentsState}
           setComments={setCommentsState}
         />
      {/* You can add a Comments component later to show comments */}
    </div>
  );
}