function parseDate(value: string): Date | null {
  const d = new Date(value + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

export function resolveDateRange(
  uiStartDate: string | null,
  uiEndDate: string | null,
  windowDays: number,
  today: Date = new Date(),
): { start: Date; end: Date } {
  const endRaw = uiEndDate ? (parseDate(uiEndDate) ?? today) : today;
  const end = new Date(
    endRaw.getFullYear(),
    endRaw.getMonth(),
    endRaw.getDate(),
  );
  if (uiStartDate) {
    const s = parseDate(uiStartDate);
    if (s)
      return {
        start: new Date(s.getFullYear(), s.getMonth(), s.getDate()),
        end,
      };
  }
  const start = new Date(end);
  start.setDate(start.getDate() - Math.max(0, windowDays - 1));
  return { start, end };
}
