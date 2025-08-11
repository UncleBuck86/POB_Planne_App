// dateHelpers.js
// Pure date formatting and manipulation helpers

export function formatDate(date) {
  if (!date) throw new Error('formatDate: date is required');
  const d = new Date(date);
  if (isNaN(d)) throw new Error('formatDate: invalid date');
  return d.toISOString().split('T')[0];
}

export function getDayOfWeek(date) {
  if (!date) throw new Error('getDayOfWeek: date is required');
  const d = new Date(date);
  if (isNaN(d)) throw new Error('getDayOfWeek: invalid date');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}
