import { cn } from '@/lib/utils'

interface HeroKpiCardProps {
  label: string
  value: string
  delta: number // percentage change, positive = up, negative = down
  sparkline: number[] // 5-10 data points, values 0-100
  className?: string
}

export function HeroKpiCard({ label, value, delta, sparkline, className }: HeroKpiCardProps) {
  const isPositive = delta >= 0
  const absPercent = Math.abs(delta).toFixed(1)
  const maxVal = Math.max(...sparkline, 1)

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-[10px] p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]',
        className
      )}
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-1.5">
        {label}
      </p>
      <p className="text-[26px] font-[800] tracking-[-1px] text-foreground leading-none mb-1">
        {value}
      </p>
      <div
        data-testid="delta-badge"
        className={cn(
          'inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded',
          isPositive
            ? 'bg-[hsl(174,60%,92%)] text-[hsl(var(--primary))]'
            : 'bg-red-100 text-red-600'
        )}
      >
        {isPositive ? '↑' : '↓'} {absPercent}%
      </div>

      {/* Sparkline */}
      <div className="flex items-end gap-[2px] h-7 mt-2.5">
        {sparkline.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-[1px]"
            style={{
              height: `${Math.max(15, (v / maxVal) * 100)}%`,
              background: isPositive
                ? `hsl(174 ${40 + (i / sparkline.length) * 42}% ${70 - (i / sparkline.length) * 39}%)`
                : `hsl(0 ${40 + (i / sparkline.length) * 30}% ${70 - (i / sparkline.length) * 20}%)`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
