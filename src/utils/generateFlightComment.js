// Utility to auto-generate flight comments based on POB changes
export function generateFlightComments(rowData, dates) {
  const flightsOut = {};
  const flightsIn = {};

  for (let i = 1; i < dates.length; i++) {
    const prevDate = dates[i - 1].date;
    const currDate = dates[i].date;
    let outComments = [];
    let inComments = [];
    rowData.forEach(row => {
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
  // First day has no prior, so empty
  flightsOut[dates[0].date] = [];
  flightsIn[dates[0].date] = [];
  return { flightsOut, flightsIn };
}
