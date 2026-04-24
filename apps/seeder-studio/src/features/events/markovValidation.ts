import type { MarkovConfig } from "@/types/simulation";

const TOLERANCE = 0.001;

export function validateMarkovConfig(config: MarkovConfig): string[] {
  const errors: string[] = [];
  const eventNames = new Set(config.events.map((e) => e.name));

  const startSum = Object.values(config.start).reduce((a, b) => a + b, 0);
  if (Math.abs(startSum - 1.0) > TOLERANCE) {
    errors.push(
      `start distribution sums to ${startSum.toFixed(4)}, expected 1.0`,
    );
  }

  for (const [from, row] of Object.entries(config.transitions)) {
    if (!eventNames.has(from)) {
      errors.push(`transition key '${from}' is not in the events list`);
    }
    const rowSum = Object.values(row).reduce((a, b) => a + b, 0);
    if (Math.abs(rowSum - 1.0) > TOLERANCE) {
      errors.push(`row '${from}' sums to ${rowSum.toFixed(4)}, expected 1.0`);
    }
    for (const to of Object.keys(row)) {
      if (to !== "[end]" && !eventNames.has(to)) {
        errors.push(
          `transition target '${to}' in row '${from}' is not in the events list`,
        );
      }
    }
  }

  return errors;
}
