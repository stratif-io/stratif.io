export function formatNum(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";

  if (abs === 0) return "0";
  if (abs < 1) return sign + abs.toFixed(2);

  if (abs < 1_000) return sign + Math.round(abs).toString();

  if (abs < 1_000_000) {
    const k = abs / 1_000;
    const rounded = Math.round(k * 10) / 10;
    if (rounded >= 1_000) {
      // promote to M to avoid "1000K"
      const m = abs / 1_000_000;
      const mRounded = Math.round(m * 10) / 10;
      return (
        sign +
        (Number.isInteger(mRounded)
          ? mRounded.toFixed(0)
          : mRounded.toFixed(1)) +
        "M"
      );
    }
    return (
      sign +
      (Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)) +
      "K"
    );
  }

  const m = abs / 1_000_000;
  const mRounded = Math.round(m * 10) / 10;
  return (
    sign +
    (Number.isInteger(mRounded) ? mRounded.toFixed(0) : mRounded.toFixed(1)) +
    "M"
  );
}
