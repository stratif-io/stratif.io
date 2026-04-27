import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface AppHeaderProps {
  onMenuClick?: () => void;
  title?: string;
  badge?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function AppHeader({
  onMenuClick,
  title,
  badge,
  children,
  className,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "h-14 shrink-0 flex items-center gap-3 px-4 bg-background border-b border-border",
        className,
      )}
    >
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          aria-label="Toggle sidebar"
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors shrink-0"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="1"
              y="2.5"
              width="14"
              height="1.5"
              rx=".75"
              fill="currentColor"
            />
            <rect
              x="1"
              y="7.25"
              width="14"
              height="1.5"
              rx=".75"
              fill="currentColor"
            />
            <rect
              x="1"
              y="12"
              width="14"
              height="1.5"
              rx=".75"
              fill="currentColor"
            />
          </svg>
        </button>
      )}
      {title && (
        <span className="text-sm font-semibold tracking-tight">{title}</span>
      )}
      {badge}
      <div className="flex-1" />
      {children}
    </header>
  );
}
