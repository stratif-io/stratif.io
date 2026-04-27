import { formatNum } from "@/lib/format";

export function headlineStat(
  values: (number | null)[],
  kind: "count" | "ratio" | "percent",
): string {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return "";
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  if (kind === "ratio") return `avg ${formatNum(avg)}`;
  if (kind === "percent") return `avg ${formatNum(avg * 100)}%`;
  return `peak ${formatNum(max)} · avg ${formatNum(avg)} · min ${formatNum(min)}`;
}
