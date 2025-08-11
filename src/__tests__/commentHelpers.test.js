// Basic unit tests for commentHelpers.js
import { generateFlightComments } from '../helpers/commentHelpers';

describe('commentHelpers', () => {
  test('generateFlightComments returns correct structure', () => {
    const rowData = [
      { company: 'A', '8/10/2025': 1, '8/11/2025': 2 },
      { company: 'B', '8/10/2025': 2, '8/11/2025': 1 }
    ];
    const dates = [
      { date: '8/10/2025' },
      { date: '8/11/2025' }
    ];
    const result = generateFlightComments(rowData, dates);
    expect(result).toHaveProperty('flightsOut');
    expect(result).toHaveProperty('flightsIn');
    expect(result.flightsOut['8/11/2025']).toContain('1-A');
    expect(result.flightsIn['8/11/2025']).toContain('1-B');
  });
});
