import { generateFlightComments } from './generateFlightComment.js';

export function generateFlightDeltas(rowData, dates) {
  const dateObjs = dates.map(d => (typeof d === 'string' ? { date: d } : { date: d.date || d.key }));
  const calc = generateFlightComments(rowData, dateObjs);
  return { out: calc.flightsOut, in: calc.flightsIn };
}
