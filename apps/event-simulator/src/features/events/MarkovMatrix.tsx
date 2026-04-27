import { cn } from "@/lib/cn";
import type { MarkovConfig } from "@/types/simulation";

interface Props {
  config: MarkovConfig;
  onChange: (config: MarkovConfig) => void;
}

const TOLERANCE = 0.001;

function rowSum(row: Record<string, number>): number {
  return Object.values(row).reduce((a, b) => a + b, 0);
}

export function MarkovMatrix({ config, onChange }: Props) {
  const eventNames = config.events.map((e) => e.name);
  const allCols = [...eventNames, "[end]"];

  function handleCellChange(from: string, to: string, raw: string) {
    const val = parseFloat(raw);
    if (isNaN(val)) return;
    const newRow = { ...(config.transitions[from] ?? {}), [to]: val };
    if (newRow[to] === 0) delete newRow[to];
    onChange({
      ...config,
      transitions: { ...config.transitions, [from]: newRow },
    });
  }

  return (
    <div className="overflow-auto">
      <table className="text-xs border-collapse min-w-max">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-muted-foreground font-medium border-b border-r border-border">
              from \ to
            </th>
            {allCols.map((col) => (
              <th
                key={col}
                className="px-2 py-1 text-center text-muted-foreground font-medium border-b border-border min-w-[72px]"
              >
                {col}
              </th>
            ))}
            <th className="px-2 py-1 text-center text-muted-foreground font-medium border-b border-l border-border">
              sum
            </th>
          </tr>
        </thead>
        <tbody>
          {eventNames.map((from) => {
            const row = config.transitions[from] ?? {};
            const sum = rowSum(row);
            const bad = Math.abs(sum - 1.0) > TOLERANCE;
            return (
              <tr key={from} className="hover:bg-muted/30">
                <td className="px-2 py-1 font-medium border-r border-border whitespace-nowrap">
                  {from}
                </td>
                {allCols.map((to) => (
                  <td
                    key={to}
                    className="px-1 py-0.5 border-border text-center"
                  >
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={row[to] ?? 0}
                      onChange={(e) =>
                        handleCellChange(from, to, e.target.value)
                      }
                      className={cn(
                        "w-16 text-center bg-transparent border border-transparent rounded px-1 py-0.5",
                        "focus:outline-none focus:border-border",
                        row[to]
                          ? "text-foreground"
                          : "text-muted-foreground/40",
                      )}
                    />
                  </td>
                ))}
                <td
                  className={cn(
                    "px-2 py-1 text-center border-l border-border font-mono tabular-nums",
                    bad
                      ? "text-destructive font-semibold"
                      : "text-muted-foreground",
                  )}
                >
                  {sum.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
