import { useState } from "react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@stratif-io/web";
import { MathFormula } from "@/lib/math/MathFormula";

export interface DailyRow {
  day: number;
  formulaLabeled?: string;
  formula?: string;
  result: string;
}

export interface SimMathEntry {
  metric: string;
  latex: string;
  where: string;
  explanation: string;
  variables: { symbol: string; meaning: string }[];
  params?: { name: string; value: string }[];
  outputValue?: string;
  dailyRows?: DailyRow[];
}

interface Props {
  entries: SimMathEntry[];
}

export function SimMathPanel({ entries }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          aria-label="Simulation math"
          className="flex w-full items-center justify-between py-1 text-xs uppercase text-muted-foreground font-semibold hover:text-foreground transition-colors"
        >
          <span>Simulation math</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col divide-y divide-border">
          {entries.map((entry) => (
            <div key={entry.metric} className="py-3 flex flex-col gap-2">
              <p className="text-[11px] font-semibold">{entry.metric}</p>
              <MathFormula
                latex={entry.latex}
                display
                className="overflow-x-auto"
              />
              {(entry.params?.length || entry.outputValue) && (
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left font-semibold text-muted-foreground py-0.5 pr-3 w-1/3">
                        Parameter
                      </th>
                      <th className="text-right font-semibold text-muted-foreground py-0.5 font-mono">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.params?.map((p) => (
                      <tr key={p.name} className="border-b border-border/40">
                        <td className="py-0.5 pr-3 text-muted-foreground">
                          {p.name}
                        </td>
                        <td className="py-0.5 text-right font-mono tabular-nums">
                          {p.value}
                        </td>
                      </tr>
                    ))}
                    {entry.outputValue && (
                      <tr>
                        <td className="pt-1 pr-3 font-semibold">→ output</td>
                        <td className="pt-1 text-right font-mono tabular-nums font-semibold">
                          {entry.outputValue}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
              {entry.dailyRows &&
                entry.dailyRows.length > 0 &&
                (() => {
                  const hasLabeled = entry.dailyRows.some(
                    (r) => r.formulaLabeled,
                  );
                  const hasFormula = entry.dailyRows.some((r) => r.formula);
                  return (
                    <table className="w-full text-[10px] border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left font-semibold text-muted-foreground py-0.5 w-6">
                            d
                          </th>
                          {hasLabeled && (
                            <th className="text-left font-semibold text-muted-foreground py-0.5 px-2 font-mono">
                              formula
                            </th>
                          )}
                          {hasFormula && (
                            <th className="text-left font-semibold text-muted-foreground py-0.5 px-2 font-mono">
                              computation
                            </th>
                          )}
                          <th className="text-right font-semibold text-muted-foreground py-0.5 font-mono">
                            =
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.dailyRows.map((row) => (
                          <tr
                            key={row.day}
                            className="border-b border-border/40"
                          >
                            <td className="py-0.5 text-muted-foreground">
                              {row.day}
                            </td>
                            {hasLabeled && (
                              <td className="py-0.5 px-2 font-mono text-muted-foreground">
                                {row.formulaLabeled ?? "—"}
                              </td>
                            )}
                            {hasFormula && (
                              <td className="py-0.5 px-2 font-mono text-muted-foreground">
                                {row.formula ?? "—"}
                              </td>
                            )}
                            <td className="py-0.5 text-right font-mono tabular-nums font-semibold">
                              {row.result}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {entry.explanation}
              </p>
              <div className="flex flex-col gap-0.5">
                {entry.variables.map((v) => (
                  <div key={v.symbol} className="flex gap-1.5 text-[10px]">
                    <span className="font-mono text-muted-foreground shrink-0">
                      <MathFormula latex={v.symbol} />
                    </span>
                    <span className="text-muted-foreground/70">
                      {v.meaning}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
