// flightDeltaService.js
// Business logic for calculating flight deltas
import { generateFlightComments } from '../helpers/commentHelpers';

export function generateFlightDeltas(rowData, dates) {
  if (!Array.isArray(rowData)) throw new Error('generateFlightDeltas: rowData must be an array');
  if (!Array.isArray(dates) || dates.length === 0) throw new Error('generateFlightDeltas: dates must be a non-empty array');
  const dateObjs = dates.map(d => (typeof d === 'string' ? { date: d } : { date: d.date || d.key }));
  const calc = generateFlightComments(rowData, dateObjs);
  return { out: calc.flightsOut, in: calc.flightsIn };
}
