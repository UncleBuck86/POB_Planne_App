// Utility: generate an array of upcoming days with key, label, dow
export function getNextNDays(n, base = new Date()) {
  const today = new Date(base);
  today.setHours(0,0,0,0);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return {
      key: (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear(),
      label: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      dow: d.toLocaleDateString('en-US', { weekday: 'short' })
    };
  });
}
