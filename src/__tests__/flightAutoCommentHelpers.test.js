// Basic unit tests for flightAutoCommentHelpers.js
import { autoCommentForFlight } from '../helpers/flightAutoCommentHelpers';

describe('flightAutoCommentHelpers', () => {
  test('autoCommentForFlight returns formatted string', () => {
    const flight = { company: 'A', date: '8/11/2025', direction: 'out', details: 'details' };
    expect(autoCommentForFlight(flight)).toBe('A out on 8/11/2025: details');
  });
});
