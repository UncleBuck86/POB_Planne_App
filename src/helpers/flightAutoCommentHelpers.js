// flightAutoCommentHelpers.js
// Pure helpers for auto-generating flight comments

export function autoCommentForFlight(flight) {
  return `${flight.company} ${flight.direction} on ${flight.date}: ${flight.details}`;
}
