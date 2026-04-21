export function formatNum(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";

  if (abs < 1) {
    const rounded = Math.round(abs * 100) / 100;
    return rounded.toFixed(2);
  }

  if (abs < 1_000) return sign + Math.round(abs).toString();

  if (abs < 1_000_000) {
    const k = abs / 1_000;
    return (
      sign +
      (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "")) +
      "K"
    );
  }

  const m = abs / 1_000_000;
  return (
    sign + (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, "")) + "M"
  );
}
