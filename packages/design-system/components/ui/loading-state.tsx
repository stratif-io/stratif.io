import { cn } from "../../lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  variant?: "spinner" | "skeleton" | "pulse";
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingState({
  variant = "spinner",
  message,
  className,
  size = "md",
}: LoadingStateProps) {
  if (variant === "spinner") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3",
          size === "sm" && "gap-2",
          size === "lg" && "gap-4",
          className,
        )}
      >
        <Loader2
          className={cn(
            "animate-spin text-muted-foreground",
            size === "sm" && "h-5 w-5",
            size === "md" && "h-8 w-8",
            size === "lg" && "h-12 w-12",
          )}
        />
        {message && (
          <p
            className={cn(
              "text-muted-foreground",
              size === "sm" && "text-xs",
              size === "md" && "text-sm",
              size === "lg" && "text-base",
            )}
          >
            {message}
          </p>
        )}
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-4 bg-muted rounded" />
      </div>
    );
  }

  // Skeleton variant
  return (
    <div className={cn("space-y-4 animate-pulse", className)}>
      <div className="h-8 bg-muted rounded w-1/3" />
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-4/6" />
      </div>
    </div>
  );
}

// Specialized loading components for common use cases

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-6 space-y-4 animate-pulse", className)}>
      <div className="h-5 bg-muted rounded w-1/3" />
      <div className="h-24 bg-muted rounded" />
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded" />
        <div className="h-3 bg-muted rounded w-5/6" />
      </div>
    </div>
  );
}

export function ChartSkeleton({
  className,
  height = "h-80",
}: {
  className?: string;
  height?: string;
}) {
  return (
    <div className={cn("space-y-4 animate-pulse", className)}>
      <div className="h-6 bg-muted rounded w-1/4" />
      <div className={cn("bg-muted rounded", height)} />
      <div className="flex gap-4">
        <div className="h-3 bg-muted rounded w-20" />
        <div className="h-3 bg-muted rounded w-20" />
        <div className="h-3 bg-muted rounded w-20" />
      </div>
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3 animate-pulse", className)}>
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b">
        <div className="h-4 bg-muted rounded w-1/4" />
        <div className="h-4 bg-muted rounded w-1/4" />
        <div className="h-4 bg-muted rounded w-1/4" />
        <div className="h-4 bg-muted rounded w-1/4" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading metric"
      className={cn(
        "rounded-xl border bg-card p-4 space-y-3 animate-pulse",
        className,
      )}
    >
      <div className="h-3 w-2/5 rounded bg-muted" />
      <div className="h-7 w-1/3 rounded bg-muted" />
      <div className="h-3 w-3/5 rounded bg-muted" />
    </div>
  );
}

/**
 * Skeleton for MiniMetricCard — matches p-3, text-[10px] label, text-lg value, text-xs badge.
 */
export function MiniMetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading metric"
      className={cn("rounded-xl border bg-card p-3 animate-pulse", className)}
    >
      {/* label: text-[10px] tracking-widest */}
      <div className="h-2.5 w-1/3 rounded bg-muted mb-1" />
      {/* value: text-lg leading-none */}
      <div className="h-[18px] w-2/5 rounded bg-muted" />
      {/* badge: text-xs with py-0.5 px-1.5 */}
      <div className="mt-1.5 h-5 w-1/4 rounded bg-muted" />
    </div>
  );
}

/**
 * Skeleton for HeroMetricCard — matches p-0 layout with chart area and overlay.
 * Uses h-full so it fills the height driven by the right column's mini skeletons.
 */
export function HeroMetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading metric"
      className={cn(
        "relative rounded-xl border bg-card overflow-hidden flex flex-col h-full min-h-[200px] animate-pulse",
        className,
      )}
    >
      {/* Overlay placeholder — mirrors absolute top-4 left-5 layout */}
      <div className="absolute top-4 left-5 space-y-2">
        {/* label: text-[10px] tracking-widest */}
        <div className="h-2.5 w-20 rounded bg-muted" />
        {/* value: text-4xl */}
        <div className="h-9 w-32 rounded bg-muted" />
        {/* badge + prev period row */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-14 rounded bg-muted" />
          <div className="h-3 w-24 rounded bg-muted" />
        </div>
      </div>

      {/* Chart area — fills the card body */}
      <div className="flex-1 bg-muted/20" />

      {/* X-axis ticks row — mirrors chart margin={{ bottom: 0 }} + XAxis */}
      <div className="h-6 flex items-center justify-between px-6">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-2 w-8 rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}
