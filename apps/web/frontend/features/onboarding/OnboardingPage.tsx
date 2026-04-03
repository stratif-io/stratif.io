import { useNavigate } from 'react-router-dom'
import { DatabaseIcon, LayoutDashboardIcon, TableIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    icon: DatabaseIcon,
    label: 'Connect your warehouse',
    sublabel: 'DuckDB, PostgreSQL, Snowflake, ClickHouse, Databricks, SQLite',
    active: true,
  },
  {
    icon: TableIcon,
    label: 'Map your events table',
    sublabel: 'Tell stratif.io where your events live',
    active: false,
  },
  {
    icon: LayoutDashboardIcon,
    label: 'Explore your data',
    sublabel: 'Trends, funnels, retention — ready to go',
    active: false,
  },
]

export function OnboardingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Greyed-out sidebar hint */}
      <div
        aria-hidden
        className="fixed left-0 top-0 bottom-0 w-[200px] bg-background border-r border-border opacity-35 pointer-events-none"
      />

      <div className="relative z-10 max-w-[420px] w-full text-center">
        {/* Logo mark */}
        <div className="w-[52px] h-[52px] rounded-[14px] bg-[hsl(var(--primary))] flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="6" width="24" height="5" rx="2.5" fill="white" fillOpacity="0.9" />
            <rect x="2" y="13" width="16" height="5" rx="2.5" fill="white" fillOpacity="0.6" />
            <rect x="2" y="20" width="10" height="5" rx="2.5" fill="white" fillOpacity="0.35" />
          </svg>
        </div>

        <h1 className="text-[20px] font-[800] tracking-[-0.5px] text-foreground mb-2">
          Welcome to stratif.io
        </h1>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-6">
          Connect your data warehouse to start exploring user trends, funnels, and retention — no
          pipelines needed.
        </p>

        {/* Steps checklist */}
        <div className="flex flex-col gap-2.5 mb-6 text-left">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3 bg-card border rounded-[10px] px-3.5 py-3',
                step.active ? 'border-[hsl(var(--primary)/0.4)]' : 'border-border opacity-45'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0',
                  step.active ? 'bg-[hsl(var(--primary)/0.1)]' : 'bg-muted'
                )}
              >
                <step.icon
                  className={cn(
                    'w-3.5 h-3.5',
                    step.active ? 'text-[hsl(var(--primary))]' : 'text-muted-foreground/50'
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-[12px] font-semibold',
                    step.active ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                  {step.sublabel}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Button
          size="lg"
          className="w-full text-[13px] font-bold h-11"
          onClick={() => navigate('/connections')}
          aria-label="Connect your first database"
        >
          Connect your first database →
        </Button>
      </div>
    </div>
  )
}
