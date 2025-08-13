// commentHelpers.js
// Pure helpers for comments

export function generateFlightComments(rowData, dates) {
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
      if (currVal > prevVal) {
        outComments.push(`${currVal - prevVal}-${row.company}`);
      } else if (currVal < prevVal) {
        inComments.push(`${prevVal - currVal}-${row.company}`);
      }
    });
    flightsOut[currDate] = outComments;
    flightsIn[currDate] = inComments;
  }
  flightsOut[dates[0].date] = [];
  flightsIn[dates[0].date] = [];
  return { flightsOut, flightsIn };
}
