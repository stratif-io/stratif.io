/* eslint-disable react-refresh/only-export-components */
/**
 * Lightweight mock of @stratif-io/design-system for Vitest.
 * Replaces Radix UI-based components with simple HTML equivalents to avoid
 * the duplicate React instance issue caused by Radix's nested node_modules.
 */
import React from "react";

// Badge
export function Badge({
  children,
  className,
  variant: _variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: string }) {
  return (
    <span className={className} {...props}>
      {children}
    </span>
  );
}
export function badgeVariants() {
  return "";
}

// Button
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
    asChild?: boolean;
  }
>(function Button(
  { children, variant: _v, size: _s, asChild: _a, ...props },
  ref,
) {
  return (
    <button ref={ref} {...props}>
      {children}
    </button>
  );
});

// Input
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input(props, ref) {
  return <input ref={ref} {...props} />;
});

// Label
export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(function Label({ children, ...props }, ref) {
  return (
    <label ref={ref} {...props}>
      {children}
    </label>
  );
});

// Select – minimal controlled implementation
const SelectCtx = React.createContext<{
  value?: string;
  onValueChange?: (v: string) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  disabled?: boolean;
}>({ open: false, setOpen: () => {} });

export function Select({
  children,
  value,
  onValueChange,
  disabled,
}: {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <SelectCtx.Provider
      value={{ value, onValueChange, open, setOpen, disabled }}
    >
      {children}
    </SelectCtx.Provider>
  );
}

export function SelectTrigger({
  children,
  className,
  id,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
}) {
  const { setOpen, disabled } = React.useContext(SelectCtx);
  return (
    <button
      id={id}
      role="combobox"
      className={className}
      disabled={disabled}
      onClick={() => setOpen(true)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = React.useContext(SelectCtx);
  return <span>{value ?? placeholder}</span>;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  const { open } = React.useContext(SelectCtx);
  if (!open) return null;
  return <div role="listbox">{children}</div>;
}

export function SelectItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const { onValueChange, setOpen } = React.useContext(SelectCtx);
  return (
    <div
      role="option"
      onClick={() => {
        onValueChange?.(value);
        setOpen(false);
      }}
    >
      {children}
    </div>
  );
}

export function SelectGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectSeparator() {
  return <hr />;
}

// Popover – minimal implementation
const PopoverCtx = React.createContext<{
  open: boolean;
  setOpen: (o: boolean) => void;
}>({ open: false, setOpen: () => {} });

export function Popover({
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (o: boolean) => {
    setInternalOpen(o);
    onOpenChange?.(o);
  };
  return (
    <PopoverCtx.Provider value={{ open, setOpen }}>
      {children}
    </PopoverCtx.Provider>
  );
}

export function PopoverTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const { setOpen, open } = React.useContext(PopoverCtx);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<{ onClick?: () => void }>,
      {
        onClick: () => setOpen(!open),
      },
    );
  }
  return <button onClick={() => setOpen(!open)}>{children}</button>;
}

export function PopoverContent({
  children,
  className,
  align: _align,
}: {
  children: React.ReactNode;
  className?: string;
  align?: string;
}) {
  const { open } = React.useContext(PopoverCtx);
  if (!open) return null;
  return <div className={className}>{children}</div>;
}

// Dialog components
export function Dialog({
  children,
  open,
}: {
  children: React.ReactNode;
  open?: boolean;
}) {
  if (!open) return null;
  return <div role="dialog">{children}</div>;
}
export function DialogContent({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2>{children}</h2>;
}
export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}
export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

// Card
export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
export function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h3 className={className}>{children}</h3>;
}

// Skeleton
export function Skeleton({ className }: { className?: string }) {
  return <div className={className} aria-hidden="true" />;
}

// Textarea
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea(props, ref) {
  return <textarea ref={ref} {...props} />;
});

// ChartSkeleton
export function ChartSkeleton({
  className,
  height: _height,
}: {
  className?: string;
  height?: string;
}) {
  return (
    <div
      className={className}
      aria-hidden="true"
      data-testid="chart-skeleton"
    />
  );
}

// CardLoadingBar
export function CardLoadingBar({ loading }: { loading?: boolean }) {
  if (!loading) return null;
  return (
    <div
      role="progressbar"
      aria-label="Simulating…"
      className="absolute top-0 left-0 right-0 h-0.5"
    />
  );
}

// AppSidebar
export function AppSidebar({
  children,
  brand,
  sections,
  collapsed: _collapsed,
}: {
  children?: React.ReactNode;
  brand?: React.ReactNode;
  sections?: {
    label: string;
    items: {
      key: string;
      label: string;
      icon?: React.ReactNode;
      active?: boolean;
      onClick?: () => void;
    }[];
  }[];
  collapsed?: boolean;
}) {
  return (
    <nav aria-label="Sidebar">
      {brand}
      {sections?.map((section) => (
        <div key={section.label}>
          <span>{section.label}</span>
          {section.items.map((item) => (
            <button
              key={item.key}
              onClick={item.onClick}
              aria-current={item.active ? "page" : undefined}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ))}
      {children}
    </nav>
  );
}

export type AppSidebarProps = React.ComponentProps<typeof AppSidebar>;

// AppHeader
export function AppHeader({
  children,
  title,
  badge,
  onMenuClick: _onMenuClick,
}: {
  children?: React.ReactNode;
  title?: React.ReactNode;
  badge?: React.ReactNode;
  onMenuClick?: () => void;
}) {
  return (
    <header>
      {title && <span>{title}</span>}
      {badge}
      {children}
    </header>
  );
}

export type AppHeaderProps = React.ComponentProps<typeof AppHeader>;

// cn util (some files may import it from @stratif-io/design-system)
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
