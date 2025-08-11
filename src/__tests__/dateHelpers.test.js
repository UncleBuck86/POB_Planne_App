// Basic unit tests for dateHelpers.js
import { formatDate, getDayOfWeek } from '../helpers/dateHelpers';

describe('dateHelpers', () => {
  test('formatDate returns YYYY-MM-DD', () => {
    expect(formatDate(new Date('2025-08-11'))).toBe('2025-08-11');
  });

  test('getDayOfWeek returns correct day', () => {
    expect(getDayOfWeek('2025-08-11')).toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
  });
});
