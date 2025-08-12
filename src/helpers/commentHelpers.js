// commentHelpers.js
// Pure helpers for comments

export function generateFlightComments(rowData, dates, directionMap = {}, defaultMode = 'OB') {
  if (!Array.isArray(rowData)) throw new Error('generateFlightComments: rowData must be an array');
  if (!Array.isArray(dates) || dates.length === 0) throw new Error('generateFlightComments: dates must be a non-empty array');
  const flightsOut = {};
  const flightsIn = {};
  for (let i = 1; i < dates.length; i++) {
    const prevDate = dates[i - 1].date;
    const currDate = dates[i].date;
    let outComments = [];
    let inComments = [];
    rowData.forEach(row => {
      if (!row.company) return;
      const prevVal = Number(row[prevDate]) || 0;
      const currVal = Number(row[currDate]) || 0;
      const key = (row.company || '').toLowerCase();
      const mode = (directionMap[key] === 'IB' || directionMap[key] === 'OB') ? directionMap[key] : (defaultMode === 'IB' ? 'IB' : 'OB');
      if (currVal === prevVal) return;
      const delta = Math.abs(currVal - prevVal);
      const inc = currVal > prevVal;
      if (mode === 'OB') {
        if (inc) outComments.push(`${delta}-${row.company}`); else inComments.push(`${delta}-${row.company}`);
      } else { // IB mode flips routing
        if (inc) inComments.push(`${delta}-${row.company}`); else outComments.push(`${delta}-${row.company}`);
      }
    });
    flightsOut[currDate] = outComments;
    flightsIn[currDate] = inComments;
  }
  flightsOut[dates[0].date] = [];
  flightsIn[dates[0].date] = [];
  return { flightsOut, flightsIn };
}
