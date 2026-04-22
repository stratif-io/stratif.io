import { useState, useRef } from "react";
import type { SimulationConfig } from "@/types/simulation";
import { useSeederStore } from "@/stores/seederStore";
import { AnomalySidebarItem } from "@/features/anomalies/AnomalySidebarItem";
import { AnomalyTrack } from "@/features/anomalies/AnomalyTrack";

const EMPTY: NonNullable<SimulationConfig["anomalies"]> = [];

export function AnomaliesFloatingPanel() {
  const anomalies = useSeederStore((s) => s.config.anomalies ?? EMPTY);
  const setAnomalies = useSeederStore((s) => s.setAnomalies);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [pos, setPos] = useState({ x: 16, y: 80 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  if (anomalies.length === 0) return null;

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    setPos({
      x: dragRef.current.origX + e.clientX - dragRef.current.startX,
      y: dragRef.current.origY + e.clientY - dragRef.current.startY,
    });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 40,
        width: 260,
      }}
      className="rounded-lg border bg-popover text-popover-foreground shadow-lg flex flex-col overflow-hidden"
    >
      {/* Draggable header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b bg-muted/40 cursor-grab select-none"
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
          Anomalies
        </span>
      </div>

      {/* Timeline track */}
      <AnomalyTrack />

      {/* Per-anomaly config */}
      <div className="flex flex-col overflow-y-auto max-h-80">
        {anomalies.map((a, i) => (
          <AnomalySidebarItem
            key={i}
            anomaly={a}
            open={openIndex === i}
            onOpenChange={(open) => setOpenIndex(open ? i : null)}
            onChange={(next) => {
              setAnomalies(anomalies.map((x, j) => (j === i ? next : x)));
            }}
            onDelete={() => {
              setAnomalies(anomalies.filter((_, j) => j !== i));
              if (openIndex === i) setOpenIndex(null);
            }}
          />
        ))}
      </div>
    </div>
  );
}
