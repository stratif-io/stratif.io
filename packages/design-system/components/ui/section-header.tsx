import { TYPOGRAPHY } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <h2 className={TYPOGRAPHY.sectionTitle}>{title}</h2>
      {subtitle && <p className={TYPOGRAPHY.muted}>{subtitle}</p>}
    </div>
  );
}
