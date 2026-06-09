export function getDaysInMonth(month: string): number {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(year, monthNum, 0).getDate();
}

export function getMonthDateRange(month: string): { start: Date; end: Date } {
  const [year, monthNum] = month.split('-').map(Number);
  const start = new Date(year, monthNum - 1, 1);
  const end = new Date(year, monthNum, 0, 23, 59, 59, 999);
  return { start, end };
}
