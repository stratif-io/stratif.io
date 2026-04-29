export function pixelToIndex(
  px: number,
  trackWidth: number,
  count: number,
): number {
  if (count <= 1 || trackWidth <= 0) return 0;
  const ratio = px / trackWidth;
  return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));
}
