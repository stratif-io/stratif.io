import { cn } from '@/lib/utils'

interface PageConfigBarProps {
  children?: React.ReactNode
  right?: React.ReactNode
  className?: string
}

export function PageConfigBar({ children, right, className }: PageConfigBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-5 py-2 bg-background border-b border-border/60 shrink-0 min-h-[40px]',
        className
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  )
}
