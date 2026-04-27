import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

export interface SidebarItem {
  key: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
}

export interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

export interface AppSidebarProps {
  sections: SidebarSection[];
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  brand?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function AppSidebar({
  sections,
  collapsed,
  onCollapse,
  brand,
  footer,
  className,
}: AppSidebarProps) {
  return (
    <aside
      data-testid="app-sidebar"
      className={cn(
        "flex flex-col shrink-0 bg-background border-r border-border overflow-hidden transition-[width] duration-200",
        collapsed ? "w-[60px]" : "w-[220px]",
        className,
      )}
    >
      {brand && (
        <div
          className={cn(
            "h-14 flex items-center border-b border-border px-4 shrink-0",
            collapsed && "justify-center px-0",
          )}
        >
          {brand}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2">
        <TooltipProvider delayDuration={0}>
          {sections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="px-4 py-2 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/70">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => (
                <SidebarNavItem
                  key={item.key}
                  item={item}
                  collapsed={collapsed}
                />
              ))}
            </div>
          ))}
        </TooltipProvider>
      </nav>

      <div
        className={cn(
          "py-2 border-t border-border",
          collapsed ? "flex justify-center" : "px-3",
        )}
      >
        <button
          onClick={() => onCollapse(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-xs w-full"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            {collapsed ? (
              <path
                d="M3 7h8M8 4l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M11 7H3M6 4L3 7l3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {footer && !collapsed && (
        <div className="px-4 py-3 border-t border-border text-[11px] text-muted-foreground">
          {footer}
        </div>
      )}
    </aside>
  );
}

function SidebarNavItem({
  item,
  collapsed,
}: {
  item: SidebarItem;
  collapsed: boolean;
}) {
  const button = (
    <button
      onClick={item.onClick}
      aria-current={item.active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors",
        collapsed && "justify-center",
        item.active
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground/70 hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <span className="shrink-0 flex items-center justify-center w-5 h-5 text-base">
        {item.icon}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <div className="px-2 py-0.5">
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      </div>
    );
  }
  return <div className="px-2 py-0.5">{button}</div>;
}
