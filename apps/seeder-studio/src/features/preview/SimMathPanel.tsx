import { useState } from "react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@stratif-io/web";
import { MathFormula } from "@/lib/math/MathFormula";

export interface SimMathEntry {
  metric: string;
  latex: string;
  where: string;
  explanation: string;
  variables: { symbol: string; meaning: string }[];
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
            <div key={entry.metric} className="py-3 flex flex-col gap-1.5">
              <p className="text-[11px] font-semibold">{entry.metric}</p>
              <MathFormula
                latex={entry.latex}
                display
                className="overflow-x-auto"
              />
              <p className="text-[10px] text-muted-foreground font-mono leading-tight">
                {entry.where}
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {entry.explanation}
              </p>
              <div className="flex flex-col gap-0.5 mt-0.5">
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
