import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Copy, ExternalLink, TrendingDown } from 'lucide-react'
import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FunnelSteps } from './FunnelSteps'
import { fetchPathFunnel } from '@/lib/api'
import type { DateRange, PathAnalysisData } from '@/types'
import { formatDateParam } from '@/lib/utils'
import { getEventColor } from '../utils/eventColors'

interface PathFunnelDialogProps {
  path: PathAnalysisData | null
  dateRange: DateRange
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PathFunnelDialog({ path, dateRange, open, onOpenChange }: PathFunnelDialogProps) {
  const [methodologyOpen, setMethodologyOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()
  const { activeFilters } = useAppStore()
  const startDate = dateRange.from ? formatDateParam(dateRange.from) : undefined
  const endDate = dateRange.to ? formatDateParam(dateRange.to) : undefined

  const events = (path?.path ?? '').split(' -> ').filter(Boolean)

  const {
    data: funnelData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['path-funnel', events.join(','), startDate, endDate, activeFilters],
    queryFn: () =>
      fetchPathFunnel({
        events,
        start_date: startDate,
        end_date: endDate,
        filters: activeFilters,
      }),
    enabled: open && events.length >= 2,
  })

  if (!path) return null

  const steps = funnelData?.data || []

  const firstStep = steps[0]
  const lastStep = steps[steps.length - 1]
  const worstStep = steps
    .slice(1)
    .reduce<
      (typeof steps)[0] | null
    >((worst, s) => (worst === null || s.step_conversion_rate < worst.step_conversion_rate ? s : worst), null)

  const getPermalink = () => {
    const params = new URLSearchParams({
      events: events.join(','),
      start_date: startDate || '',
      end_date: endDate || '',
    })
    return `/funnel?${params.toString()}`
  }

  const copyPermalink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${getPermalink()}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openFullPage = () => {
    onOpenChange(false)
    navigate(getPermalink())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              Conversion Funnel
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Copy permalink"
                      onClick={copyPermalink}
                    >
                      {copied ? (
                        <span className="text-success text-xs font-medium">Copied!</span>
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy permalink</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Open full page"
                      onClick={openFullPage}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open full page</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Path pill chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {events.map((event, i) => (
              <Fragment key={i}>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getEventColor(event)}`}
                >
                  {event}
                </span>
                {i < events.length - 1 && (
                  <span className="text-muted-foreground/50 text-xs">→</span>
                )}
              </Fragment>
            ))}
          </div>

          {/* Summary metrics when loaded */}
          {!isLoading && steps.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-primary/10 p-4 rounded-xl">
                <div className="text-xs text-primary mb-1">Started</div>
                <div className="font-bold text-base text-primary">
                  {firstStep?.users.toLocaleString()}
                </div>
              </div>
              <div className="bg-success/10 p-4 rounded-xl">
                <div className="text-xs text-success mb-1">Completed all</div>
                <div className="font-bold text-base text-success">
                  {lastStep?.users.toLocaleString()}
                </div>
                <div className="text-xs text-success/70">
                  {lastStep?.overall_conversion_rate}% of starters
                </div>
              </div>
              <div className="bg-destructive/10 p-4 rounded-xl">
                <div className="text-xs text-destructive mb-1">Biggest drop</div>
                <div className="font-bold text-base text-destructive">
                  {worstStep ? `${worstStep.dropoff_rate}%` : '—'}
                </div>
                <div className="text-xs text-destructive/70 truncate">
                  {worstStep ? `at "${worstStep.event}"` : ''}
                </div>
              </div>
            </div>
          )}

          {/* Funnel steps */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Funnel Steps</h4>
            {isLoading ? (
              <div className="space-y-2">
                {events.map((_, i) => (
                  <div key={i} className="p-3 rounded-xl border space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="text-sm text-destructive text-center py-3">Error loading funnel data</p>
            ) : steps.length > 0 ? (
              <FunnelSteps steps={steps} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-3">
                No funnel data available
              </p>
            )}
          </div>

          {/* Methodology */}
          <Collapsible open={methodologyOpen} onOpenChange={setMethodologyOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-sm font-medium">How this is calculated</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${methodologyOpen ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="text-xs text-muted-foreground space-y-1.5 p-3 rounded-lg bg-muted/50 mt-1">
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    Each step shows people who did <em>every prior step first</em>, in order
                  </li>
                  <li>Other events between steps are allowed — no direct jump required</li>
                  <li>"% of starters" = people at this step ÷ people at step 1</li>
                </ul>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DialogContent>
    </Dialog>
  )
}
