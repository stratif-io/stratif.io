import { TYPOGRAPHY } from "../../lib/constants";
import { cn } from "../../lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function PageHeader({ title, subtitle, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <h1 className={TYPOGRAPHY.pageLabel}>{title}</h1>
      {subtitle && <p className={TYPOGRAPHY.muted}>{subtitle}</p>}
    </div>
  );
}
