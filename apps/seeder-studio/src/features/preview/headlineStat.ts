import { formatNum } from "@/lib/format";

export function headlineStat(
  values: number[],
  kind: "count" | "ratio",
): string {
  if (values.length === 0) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (kind === "ratio") return `avg ${formatNum(avg)}`;
  return `peak ${formatNum(max)} · avg ${formatNum(avg)} · min ${formatNum(min)}`;
}
