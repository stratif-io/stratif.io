import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ChevronDown,
  Copy,
  ExternalLink,
  HelpCircle,
  Info,
  TrendingDown,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { fetchPathFunnel } from '@/lib/api'
import type { DateRange, PathAnalysisData } from '@/types'

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
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined

  const events = path?.path.split(' -> ') || []

  const {
    data: funnelData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['path-funnel', events.join(','), startDate, endDate],
    queryFn: () =>
      fetchPathFunnel({
        events,
        start_date: startDate,
        end_date: endDate,
      }),
    enabled: open && events.length >= 2,
  })

  if (!path) return null

  const steps = funnelData?.data || []

  const formatSequence = (upToIndex: number) => {
    return events.slice(0, upToIndex + 1).join(' → ')
  }

  const getPermalink = () => {
    const params = new URLSearchParams({
      events: events.join(','),
      start_date: startDate || '',
      end_date: endDate || '',
    })
    return `/funnel?${params.toString()}`
  }

  const copyPermalink = async () => {
    const url = `${window.location.origin}${getPermalink()}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openFullPage = () => {
    onOpenChange(false)
    navigate(getPermalink())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              Conversion Funnel
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyPermalink}>
                      {copied ? (
                        <span className="text-green-500 text-xs font-medium">Copied!</span>
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy permalink</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openFullPage}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open in full page</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p>
                Users must complete steps in the specified order, but intermediate events are
                allowed between steps.
              </p>
              <p>Each step shows users who completed the sequence up to that point.</p>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Path:</span>{' '}
            <span className="font-mono text-foreground text-xs">{path.path}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <div className="text-muted-foreground flex items-center gap-1">
                      Total Event Occurrences
                      <HelpCircle className="h-3 w-3" />
                    </div>
                    <div className="font-semibold text-lg">
                      {path.occurrence_count.toLocaleString()}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total times this event sequence occurred, regardless of funnel position</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <div className="text-muted-foreground flex items-center gap-1">
                      Unique Users
                      <HelpCircle className="h-3 w-3" />
                    </div>
                    <div className="font-semibold text-lg">
                      {path.unique_users.toLocaleString()}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Distinct users who completed this event sequence</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div>
              <div className="text-muted-foreground">% of Total</div>
              <div className="font-semibold text-lg">{path.percentage_of_total}%</div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Funnel Steps</h4>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : error ? (
              <div className="text-sm text-red-500 text-center py-4">Error loading funnel data</div>
            ) : steps.length > 0 ? (
              <div className="space-y-4">
                <TooltipProvider>
                  {steps.map((step, idx) => (
                    <div key={idx} className="space-y-2 p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={idx === 0 ? 'default' : 'secondary'}>{step.step}</Badge>
                          <span className="font-medium">{step.event}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-muted-foreground cursor-help">
                                <span className="font-semibold text-foreground">
                                  {step.occurrences.toLocaleString()}
                                </span>{' '}
                                occ.
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Total times this event occurred, regardless of funnel position</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 text-muted-foreground cursor-help">
                                <Users className="h-3 w-3" />
                                <span className="font-semibold text-foreground">
                                  {step.users.toLocaleString()}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Users who completed the full sequence up to this step</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {step.users.toLocaleString()} users completed{' '}
                        <span className="font-mono font-medium text-foreground">
                          {formatSequence(idx)}
                        </span>{' '}
                        in order
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={step.overall_conversion_rate} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          {step.overall_conversion_rate}%
                        </span>
                      </div>
                      {idx > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Step conversion:{' '}
                            <span className="text-foreground font-medium">
                              {step.step_conversion_rate}%
                            </span>
                          </span>
                          {step.dropoff_users > 0 && (
                            <span className="text-red-500">
                              -{step.dropoff_users.toLocaleString()} users ({step.dropoff_rate}%)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </TooltipProvider>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No funnel data available
              </div>
            )}
          </div>

          <Collapsible open={methodologyOpen} onOpenChange={setMethodologyOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-sm font-medium">Methodology</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${methodologyOpen ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="text-sm text-muted-foreground space-y-2 p-3 rounded-lg bg-muted/50">
                <ul className="list-disc list-inside space-y-1">
                  <li>The funnel counts users who performed events in the specified order</li>
                  <li>Intermediate events between funnel steps are allowed</li>
                  <li>First occurrence of each event is used for each user</li>
                  <li>
                    <strong>Drop-off</strong> = users who reached previous step but not this step
                  </li>
                </ul>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DialogContent>
    </Dialog>
  )
}
