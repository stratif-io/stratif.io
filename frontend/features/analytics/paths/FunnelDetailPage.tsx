import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Plus,
  TrendingDown,
  X,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { PageTransition } from '@/components/layout/PageTransition'
import { EmptyState } from '@/components/ui/empty-state'
import { FunnelSteps } from './components/FunnelSteps'
import { fetchPathFunnel, fetchEvents } from '@/lib/api'
import { useAppStore } from '@/stores'
import { SPACING, TYPOGRAPHY, FILTER_TRIGGER_CLASS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useDeferredLoading, useReducedMotion } from '@/hooks'

const MAX_STEPS = 10

const segTrigger = FILTER_TRIGGER_CLASS

export function FunnelDetailPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { dateRange, setDateRange, activeFilters, activeConnectionId } = useAppStore()
  const [methodologyOpen, setMethodologyOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const eventsParam = searchParams.get('events') || ''
  const initialEvents = eventsParam.split(',').filter(Boolean)

  const [funnelSteps, setFunnelSteps] = useState<string[]>(() =>
    initialEvents.length >= 2 ? initialEvents : ['', '']
  )

  // Non-empty steps used for the API call
  const events = funnelSteps.filter(Boolean)

  const startDateParam = searchParams.get('start_date')
  const endDateParam = searchParams.get('end_date')

  const { data: eventsResponse } = useQuery({
    queryKey: ['events', activeConnectionId],
    queryFn: () => fetchEvents(activeConnectionId ?? undefined),
    staleTime: 5 * 60 * 1000,
  })
  const availableEvents = eventsResponse?.events || []

  useEffect(() => {
    if (startDateParam && endDateParam) {
      const from = new Date(startDateParam)
      const to = new Date(endDateParam)
      if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
        setDateRange({ from, to })
      }
    }
  }, [startDateParam, endDateParam, setDateRange])

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      setSearchParams({
        ...Object.fromEntries(searchParams),
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd'),
      })
    }
  }, [dateRange])

  // Sync step and device state back to URL
  useEffect(() => {
    const current = Object.fromEntries(searchParams)
    const next: Record<string, string> = { ...current }
    if (events.length >= 2) next['events'] = events.join(',')
    delete next['device_type']
    setSearchParams(next)
  }, [funnelSteps])

  const addStep = () => {
    if (funnelSteps.length < MAX_STEPS) {
      setFunnelSteps((prev) => [...prev, ''])
    }
  }

  const removeStep = (index: number) => {
    if (funnelSteps.length > 2) {
      setFunnelSteps((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const updateStep = (index: number, value: string) => {
    setFunnelSteps((prev) => prev.map((s, i) => (i === index ? value : s)))
  }

  const stepLabel = (index: number) => {
    if (index === 0) return 'Start'
    if (index === funnelSteps.length - 1) return 'End'
    return `Step ${index + 1}`
  }

  const stepPlaceholder = (index: number) => {
    if (index === 0) return 'Any start'
    if (index === funnelSteps.length - 1) return 'Any end'
    return 'Any event'
  }

  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined

  const {
    data: funnelData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['path-funnel', events.join(','), startDate, endDate, activeFilters, activeConnectionId],
    queryFn: () =>
      fetchPathFunnel({
        events,
        start_date: startDate,
        end_date: endDate,
        filters: activeFilters,
        connection_id: activeConnectionId ?? undefined,
      }),
    enabled: events.length >= 2,
  })

  const steps = funnelData?.data || []
  const showSkeleton = useDeferredLoading(isLoading)

  const copyPermalink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Derived summary metrics
  const firstStep = steps[0]
  const lastStep = steps[steps.length - 1]
  const worstStep = steps
    .slice(1)
    .reduce<
      (typeof steps)[0] | null
    >((worst, s) => (worst === null || s.step_conversion_rate < worst.step_conversion_rate ? s : worst), null)

  return (
    <PageTransition>
      <motion.div
        initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
      >
        <div className={SPACING.page}>
          <div className={SPACING.section}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/paths')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <span className={TYPOGRAPHY.pageLabel}>Conversion Funnel</span>
                  <p className="text-muted-foreground mt-1 text-sm font-mono">
                    {events.length >= 2 ? events.join(' → ') : 'Configure steps below'}
                  </p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={copyPermalink}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? 'Copied!' : 'Copy permalink'}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Filter bar */}
            <div className="flex items-center rounded-lg border bg-background shadow-sm overflow-hidden divide-x divide-border">
              {/* Dynamic funnel steps */}
              {funnelSteps.map((step, index) => (
                <div key={index} className="flex items-center shrink-0">
                  {/* Remove button — only when more than 2 steps */}
                  {funnelSteps.length > 2 && (
                    <button
                      onClick={() => removeStep(index)}
                      className="h-9 w-5 flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-accent/60 transition-colors ml-1"
                      aria-label={`Remove step ${index + 1}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}

                  <Select
                    value={step || '__any__'}
                    onValueChange={(v) => updateStep(index, v === '__any__' ? '' : v)}
                  >
                    <SelectTrigger
                      className={cn(segTrigger, step && 'text-foreground')}
                      style={{ width: 'auto', minWidth: 0 }}
                    >
                      <span className="text-xs text-muted-foreground/50 mr-1 font-normal">
                        {stepLabel(index)}
                      </span>
                      <SelectValue placeholder={stepPlaceholder(index)} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">{stepPlaceholder(index)}</SelectItem>
                      {availableEvents.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Arrow connector between steps */}
                  {index < funnelSteps.length - 1 && (
                    <div className="flex items-center justify-center w-5 shrink-0 text-muted-foreground/30 pointer-events-none select-none">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {/* Add step button */}
              {funnelSteps.length < MAX_STEPS && (
                <button
                  onClick={addStep}
                  className={cn(segTrigger, 'flex items-center gap-1 h-9 px-3 cursor-pointer')}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add step</span>
                </button>
              )}
            </div>

            {events.length < 2 ? (
              <EmptyState
                icon={TrendingDown}
                title="Configure your funnel"
                description="Select at least 2 events above to analyze your conversion funnel."
              />
            ) : (
              <>
                {/* Summary cards */}
                {!isLoading && steps.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Started
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {firstStep?.users.toLocaleString() ?? '—'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          people did &quot;{events[0]}&quot;
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Completed all steps
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {lastStep?.users.toLocaleString() ?? '—'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {lastStep?.overall_conversion_rate}% of people who started
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Biggest drop
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {worstStep ? worstStep.dropoff_users.toLocaleString() : '—'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {worstStep
                            ? `people left at "${worstStep.event}" (${worstStep.dropoff_rate}%)`
                            : 'No drop-offs'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Funnel visualization */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle>Step-by-Step Breakdown</CardTitle>
                        <CardDescription>
                          How users progress (or drop off) through each step
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {showSkeleton ? (
                      <div className="space-y-3">
                        {events.map((_, i) => (
                          <div key={i} className="space-y-2 p-4 rounded-xl border">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-5 w-full" />
                          </div>
                        ))}
                      </div>
                    ) : error ? (
                      <EmptyState
                        icon={TrendingDown}
                        title="Error loading funnel data"
                        description="There was a problem fetching funnel data. Try refreshing the page."
                      />
                    ) : steps.length > 0 ? (
                      <FunnelSteps steps={steps} />
                    ) : (
                      <EmptyState
                        icon={TrendingDown}
                        title="No funnel data"
                        description="No users completed the first step in this date range."
                      />
                    )}

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
                        <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50 mt-1">
                          <ul className="list-disc list-inside space-y-1.5">
                            <li>
                              Each step shows people who did <em>every prior step first</em>, in
                              order
                            </li>
                            <li>Other events between steps are fine — no direct jump required</li>
                            <li>
                              &quot;% of starters&quot; = people at this step ÷ people at step 1
                            </li>
                            <li>
                              &quot;People left here&quot; = those who never continued to the next
                              step
                            </li>
                          </ul>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </PageTransition>
  )
}
