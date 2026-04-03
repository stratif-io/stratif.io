import { ShareIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title: string
  subtitle?: string
  showShare?: boolean
  onShare?: () => void
  children?: React.ReactNode
  className?: string
}

export function Header({ title, subtitle, showShare, onShare, children, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center gap-3 px-5 py-3 bg-background border-b border-border shrink-0',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[15px] font-bold tracking-[-0.3px] text-foreground leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-[10px] text-muted-foreground/70 leading-none">{subtitle}</p>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {children}
        {showShare && (
          <Button
            size="sm"
            onClick={onShare}
            className="h-7 px-3 text-[11px] font-semibold gap-1.5"
            aria-label="Share"
          >
            <ShareIcon className="w-3 h-3" />
            Share
          </Button>
        )}
      </div>
    </header>
  )
}
