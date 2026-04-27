import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

export interface ResizablePanelProps {
  open: boolean;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  children?: React.ReactNode;
  className?: string;
}

export function ResizablePanel({
  open,
  defaultWidth = 320,
  minWidth = 200,
  maxWidth = 640,
  children,
  className,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - e.clientX;
      const next = Math.min(
        maxWidth,
        Math.max(minWidth, startWidth.current + delta),
      );
      setWidth(next);
    },
    [minWidth, maxWidth],
  );

  const onMouseUp = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const startDrag = (e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  };

  if (!open) return null;

  return (
    <div className="flex shrink-0" style={{ width }}>
      {/* drag handle */}
      <div
        onMouseDown={startDrag}
        className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/40 transition-colors"
        aria-hidden="true"
      />
      <div className={cn("flex-1 overflow-y-auto", className)}>{children}</div>
    </div>
  );
}
