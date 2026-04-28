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
  badge?: string;
  children?: SidebarItem[];
  expanded?: boolean;
  onToggleExpand?: () => void;
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
  itemWrapper?: (item: SidebarItem, button: ReactNode) => ReactNode;
}

export function AppSidebar({
  sections,
  collapsed,
  onCollapse,
  brand,
  footer,
  className,
  itemWrapper,
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
            "min-h-14 py-3 flex items-center border-b border-border shrink-0 overflow-hidden",
            collapsed ? "justify-center px-0" : "px-4",
          )}
        >
          {brand}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2">
        <TooltipProvider delayDuration={0}>
          {sections.map((section, i) => (
            <div key={section.label || i}>
              {!collapsed && section.label && (
                <p className="px-4 py-2 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/70">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => (
                <SidebarNavItem
                  key={item.key}
                  item={item}
                  collapsed={collapsed}
                  itemWrapper={itemWrapper}
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
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-xs",
            collapsed ? "w-9 justify-center" : "w-full",
          )}
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
  itemWrapper,
  indent = false,
}: {
  item: SidebarItem;
  collapsed: boolean;
  itemWrapper?: (item: SidebarItem, button: ReactNode) => ReactNode;
  indent?: boolean;
}) {
  const hasChildren = !collapsed && item.children && item.children.length > 0;

  const button = (
    <button
      onClick={item.onClick}
      aria-current={item.active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors",
        collapsed && "justify-center",
        indent && "pl-6",
        item.active
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground/70 hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <span className="shrink-0 flex items-center justify-center w-5 h-5 text-base">
        {item.icon}
      </span>
      {!collapsed && (
        <span className="flex-1 truncate text-left">{item.label}</span>
      )}
      {!collapsed && item.badge && (
        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium shrink-0">
          {item.badge}
        </span>
      )}
    </button>
  );

  const wrappedButton = itemWrapper ? itemWrapper(item, button) : button;

  const chevron =
    !collapsed && hasChildren && item.onToggleExpand ? (
      <button
        onClick={(e) => {
          e.stopPropagation();
          item.onToggleExpand?.();
        }}
        aria-label={
          item.expanded ? `Collapse ${item.label}` : `Expand ${item.label}`
        }
        className="p-1 rounded hover:bg-muted/50 text-muted-foreground shrink-0"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
          className={cn(
            "transition-transform duration-150",
            item.expanded && "rotate-90",
          )}
        >
          <path
            d="M3 2l4 3-4 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    ) : null;

  const row = chevron ? (
    <div className="flex items-center gap-0.5">
      <div className="flex-1 min-w-0">{wrappedButton}</div>
      <div className="pr-1">{chevron}</div>
    </div>
  ) : (
    wrappedButton
  );

  const withTooltip = collapsed ? (
    <Tooltip>
      {/* Use raw button (not wrappedButton) in collapsed mode — children are hidden,
          and PopoverTrigger requires direct button ownership */}
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  ) : (
    row
  );

  return (
    <>
      <div className="px-2 py-0.5">{withTooltip}</div>
      {hasChildren &&
        item.expanded &&
        item.children!.map((child) => (
          <SidebarNavItem
            key={child.key}
            item={child}
            collapsed={collapsed}
            itemWrapper={itemWrapper}
            indent={true}
          />
        ))}
    </>
  );
}
