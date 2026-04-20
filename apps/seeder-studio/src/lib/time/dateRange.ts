export function resolveDateRange(
  uiStartDate: string | null,
  uiEndDate: string | null,
  windowDays: number,
  today: Date = new Date(),
): { start: Date; end: Date } {
  const endRaw = uiEndDate ? new Date(uiEndDate + "T00:00:00") : today;
  const end = new Date(
    endRaw.getFullYear(),
    endRaw.getMonth(),
    endRaw.getDate(),
  );
  if (uiStartDate) {
    const s = new Date(uiStartDate + "T00:00:00");
    return { start: new Date(s.getFullYear(), s.getMonth(), s.getDate()), end };
  }
  const start = new Date(end);
  start.setDate(start.getDate() - Math.max(0, windowDays - 1));
  return { start, end };
}
