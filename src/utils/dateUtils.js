export function getAllDates(year) {
  const dates = [];
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
    const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
    dates.push({ date: dateStr, day: dayStr });
  }
  return dates;
}

export function formatDate(date) {
  return (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
}
