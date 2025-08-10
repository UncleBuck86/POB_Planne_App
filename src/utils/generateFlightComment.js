// generateFlightComment.js
// Utility function to auto-generate flight comments based on changes in POB (Person On Board) for each company and date
// Used to help track flights in/out for each day

// Main export: generates flight out/in comments for each date
export function generateFlightComments(rowData, dates) {
  const flightsOut = {}; // Object to hold outbound flight comments per date
  const flightsIn = {};  // Object to hold inbound flight comments per date

  // Loop through each date (starting from second date)
  for (let i = 1; i < dates.length; i++) {
    const prevDate = dates[i - 1].date; // Previous date string
    const currDate = dates[i].date;     // Current date string
    let outComments = []; // Companies with increased POB (outbound)
    let inComments = [];  // Companies with decreased POB (inbound)
    rowData.forEach(row => {
      const prevVal = Number(row[prevDate]) || 0; // POB for previous date
      const currVal = Number(row[currDate]) || 0; // POB for current date
      // If POB increased, record as outbound flight
      if (currVal > prevVal) {
        outComments.push(`${currVal - prevVal}-${row.company}`);
      // If POB decreased, record as inbound flight
      } else if (currVal < prevVal) {
        inComments.push(`${prevVal - currVal}-${row.company}`);
      }
    });
    flightsOut[currDate] = outComments;
    flightsIn[currDate] = inComments;
  }
  // First day has no prior, so set empty arrays
  flightsOut[dates[0].date] = [];
  flightsIn[dates[0].date] = [];
  return { flightsOut, flightsIn }; // Return both objects
}
