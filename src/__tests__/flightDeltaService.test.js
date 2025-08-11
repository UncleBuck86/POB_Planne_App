// Basic unit tests for flightDeltaService.js
import { generateFlightDeltas } from '../services/flightDeltaService';

describe('flightDeltaService', () => {
  test('generateFlightDeltas returns out/in structure', () => {
    const rowData = [
      { company: 'A', '8/10/2025': 1, '8/11/2025': 2 },
      { company: 'B', '8/10/2025': 2, '8/11/2025': 1 }
    ];
    const dates = [
      { date: '8/10/2025' },
      { date: '8/11/2025' }
    ];
    const result = generateFlightDeltas(rowData, dates);
    expect(result).toHaveProperty('out');
    expect(result).toHaveProperty('in');
    expect(result.out['8/11/2025']).toContain('1-A');
    expect(result.in['8/11/2025']).toContain('1-B');
  });
});
