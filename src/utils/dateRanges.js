// Utility: generate an array of upcoming days with key, label, dow
import { formatMMDDYY } from './dateUtils.js';
export function getNextNDays(n, base = new Date()) {
  const today = new Date(base);
  today.setHours(0,0,0,0);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return {
      key: (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear(),
      label: formatMMDDYY(d),
      dow: d.toLocaleDateString('en-US', { weekday: 'short' })
    };
  });
}
