import { useState, useEffect, useRef } from "react";
import { MathFormula } from "@/lib/math/MathFormula";
import type { GhostLine } from "@/features/preview/KpiChart";
import type { FormulaVariable } from "@/features/preview/formulaRegistry";
import { AXIS_DISPLAY } from "@/features/axes/axisDisplaySpec";
import { AxisPopover } from "@/features/studio/AxisPopover";
import type { PipelineStep } from "./kpiPipelineConfigs";

function latexToPlain(latex: string): string {
  return latex
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ")
    .replace(/\\delta/g, "δ")
    .replace(/\\sigma/g, "σ")
    .replace(/\\tau/g, "τ")
    .replace(/\\delta/g, "δ")
    .replace(/\\text\{[^}]*\}/g, "")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[{}_^]/g, "")
    .trim();
}

export function ParamInput({
  externalValue,
  onCommit,
}: {
  externalValue: number;
  onCommit: (val: number) => void;
}) {
  const [draft, setDraft] = useState(String(externalValue));

  // Sync when external value changes (e.g. preset switch) but only when not focused
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDraft(String(externalValue));
    }
  }, [externalValue]);

  return (
    <input
      ref={inputRef}
      type="number"
      min={1}
      value={draft}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const n = parseFloat(draft);
        if (!isNaN(n) && n > 0) onCommit(n);
        else setDraft(String(externalValue));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        e.stopPropagation();
      }}
      className="w-20 h-6 rounded border border-border bg-muted/40 px-1.5 text-right font-mono text-xs font-bold text-foreground shrink-0 focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );
}

export function PipelineFormula({
  ghostLines,
  mainColor,
  focusedKey,
  clickedKey,
  onHover,
  onClick,
  steps,
  axisMap: _axisMap,
  footnote,
  latexOverrides = {},
  axes = {},
  onAxisChange,
  checkedSteps,
  onToggleStep,
  allVars = [],
  allParams = [],
  editableParams,
}: {
  ghostLines: GhostLine[];
  mainColor: string;
  focusedKey: string | null;
  clickedKey: string | null;
  onHover: (key: string | null) => void;
  onClick: (key: string) => void;
  steps: PipelineStep[];
  axisMap: Record<string, string>;
  footnote?: string;
  latexOverrides?: Record<string, string>;
  axes?: Record<string, string>;
  onAxisChange?: (axisId: string, value: string) => void;
  checkedSteps?: Set<string>;
  onToggleStep?: (key: string) => void;
  allVars?: FormulaVariable[];
  allParams?: { sym: string; name: string; value: string }[];
  editableParams?: Record<string, (val: number) => void>;
}) {
  const colorMap: Record<string, string> = { __main__: mainColor };
  for (const g of ghostLines) colorMap[g.key] = g.color;
  const [openAxisKey, setOpenAxisKey] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-0.5" data-pipeline-formula>
      {steps.map((step) => {
        const stepColor =
          step.lineKey === "__main__"
            ? mainColor
            : (colorMap[step.lineKey] ?? step.color);
        const latex = latexOverrides[step.lineKey] ?? step.latex;
        const isActive = focusedKey === step.lineKey;
        const isDimmed = focusedKey !== null && !isActive;
        const isChecked = checkedSteps?.has(step.lineKey) ?? false;

        const stepVars = step.tooltipVarSymbols
          ? allVars.filter((v) => step.tooltipVarSymbols!.includes(v.symbol))
          : [];
        const stepParams = step.tooltipParamSyms
          ? allParams.filter((p) => step.tooltipParamSyms!.includes(p.sym))
          : [];
        const hasTooltip = stepVars.length > 0 || stepParams.length > 0;

        return (
          <div
            key={step.lineKey}
            className={[
              "group/step flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all cursor-pointer",
              isActive
                ? "bg-muted/60 ring-1 ring-border/60"
                : "hover:bg-muted/40",
              isDimmed ? "opacity-35" : "opacity-100",
            ].join(" ")}
            onMouseEnter={() => onHover(step.lineKey)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClick(step.lineKey)}
          >
            {/* Color dot */}
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: stepColor }}
            />

            {/* Label + formula */}
            <div className="relative flex-1 min-w-0">
              <button
                type="button"
                className="w-full text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(step.lineKey);
                }}
              >
                <p className="text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wide mb-0 flex items-center gap-1 leading-none">
                  {step.label}
                  {hasTooltip && (
                    <span className="opacity-0 group-hover/step:opacity-60 transition-opacity text-[8px] font-normal normal-case tracking-normal">
                      ⓘ
                    </span>
                  )}
                </p>
                <div className="overflow-x-auto text-sm leading-none">
                  <MathFormula latex={latex} />
                </div>
              </button>

              {hasTooltip && clickedKey === step.lineKey && (
                <div className="absolute left-0 bottom-full mb-1 z-30 bg-card border border-border/60 rounded-xl shadow-xl px-3 py-2 min-w-64 max-w-sm">
                  {stepVars.map((v, i) => {
                    const plain = latexToPlain(v.symbol);
                    const matchedParam = stepParams.find(
                      (p) => p.sym === plain || p.sym === v.symbol,
                    );
                    const varAxisId = step.axisVarMap?.[v.symbol];
                    const varAxisDisplay = varAxisId
                      ? AXIS_DISPLAY[varAxisId]
                      : null;
                    const varAxisVal = varAxisId ? (axes[varAxisId] ?? "") : "";
                    const varAxisLabel = varAxisDisplay
                      ? (varAxisDisplay.values.find(
                          (av) => av.value === varAxisVal,
                        )?.label ?? varAxisVal)
                      : "";
                    const axisKey = `${step.lineKey}:${v.symbol}`;
                    const isAxisOpen = openAxisKey === axisKey;
                    return (
                      <div
                        key={v.symbol}
                        className={i > 0 ? "border-t border-border/20" : ""}
                      >
                        <div className="flex items-center gap-2 py-1">
                          <span className="text-primary shrink-0 text-xs leading-none">
                            <MathFormula latex={v.symbol} />
                          </span>
                          <span className="text-xs text-muted-foreground leading-snug flex-1">
                            {v.meaning}
                          </span>
                          {varAxisDisplay && onAxisChange ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenAxisKey((prev) =>
                                  prev === axisKey ? null : axisKey,
                                );
                              }}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border/50 bg-muted/40 hover:bg-muted transition-colors shrink-0"
                            >
                              <span className="font-mono text-[11px] font-bold text-foreground leading-none">
                                {varAxisLabel}
                              </span>
                              <span className="text-muted-foreground/50 text-[10px] leading-none">
                                {isAxisOpen ? "▴" : "▾"}
                              </span>
                            </button>
                          ) : (
                            matchedParam && (
                              <span className="font-mono text-xs font-bold text-foreground shrink-0">
                                {matchedParam.value}
                              </span>
                            )
                          )}
                        </div>
                        {isAxisOpen && varAxisDisplay && onAxisChange && (
                          <div
                            className="pb-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AxisPopover
                              axis={varAxisDisplay}
                              currentValue={varAxisVal}
                              onSelect={(val) => {
                                onAxisChange!(varAxisId!, val);
                                setOpenAxisKey(null);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {stepParams
                    .filter((p) => {
                      const plain = latexToPlain(p.sym);
                      return !stepVars.some(
                        (v) =>
                          latexToPlain(v.symbol) === plain ||
                          v.symbol === p.sym,
                      );
                    })
                    .map((p, i) => (
                      <div
                        key={p.sym}
                        className={`flex items-center gap-2 py-1 border-t border-border/20 ${stepVars.length === 0 && i === 0 ? "border-0" : ""}`}
                      >
                        <span className="font-mono text-primary shrink-0 text-xs font-semibold">
                          {p.sym}
                        </span>
                        <span className="text-xs text-muted-foreground flex-1 leading-snug">
                          {p.name}
                        </span>
                        {editableParams?.[p.sym] ? (
                          <ParamInput
                            externalValue={parseFloat(p.value)}
                            onCommit={editableParams[p.sym]}
                          />
                        ) : (
                          <span className="font-mono text-xs font-bold text-foreground shrink-0">
                            {p.value}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Add-column toggle — rightmost, icon-only */}
            {onToggleStep && step.lineKey !== "__main__" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStep(step.lineKey);
                }}
                title={
                  isChecked ? "Remove column from table" : "Add column to table"
                }
                className={[
                  "shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors",
                  isChecked
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground/30 hover:text-muted-foreground/70",
                ].join(" ")}
              >
                {isChecked ? (
                  <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                    <rect
                      x="1"
                      y="1"
                      width="4"
                      height="10"
                      rx="1"
                      fill="currentColor"
                      opacity="0.4"
                    />
                    <rect
                      x="7"
                      y="1"
                      width="4"
                      height="10"
                      rx="1"
                      fill="currentColor"
                    />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                    <rect
                      x="1"
                      y="1"
                      width="4"
                      height="10"
                      rx="1"
                      fill="currentColor"
                      opacity="0.25"
                    />
                    <rect
                      x="7"
                      y="1"
                      width="4"
                      height="10"
                      rx="1"
                      fill="currentColor"
                      opacity="0.25"
                    />
                    <path
                      d="M9 4v4M7 6h4"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
        );
      })}
      {/* Optional footnote */}
      {footnote && (
        <p className="text-[10px] text-muted-foreground/50 px-2 pt-1">
          {footnote}
        </p>
      )}
    </div>
  );
}
