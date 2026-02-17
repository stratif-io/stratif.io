import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Monitor,
  Smartphone,
  TrendingDown,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { PageTransition } from '@/components/layout/PageTransition'
import { EmptyState } from '@/components/ui/empty-state'
import { FunnelSteps } from './components/FunnelSteps'
import { fetchPathFunnel, fetchEvents } from '@/lib/api'
import { useAppStore } from '@/stores'
import { SPACING, TYPOGRAPHY } from '@/lib/constants'
import { cn } from '@/lib/utils'

const segTrigger =
  'h-9 border-0 shadow-none rounded-none bg-transparent gap-1.5 px-3 text-sm font-medium focus:ring-0 focus:ring-offset-0 hover:bg-accent/60 transition-colors text-muted-foreground'

export function FunnelDetailPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { dateRange, setDateRange, selectedCountry, selectedBrowser } = useAppStore()
  const [methodologyOpen, setMethodologyOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const eventsParam = searchParams.get('events') || ''
  const initialEvents = eventsParam.split(',').filter(Boolean)

  const [startEvent, setStartEvent] = useState<string>(initialEvents[0] || '')
  const [endEvent, setEndEvent] = useState<string>(initialEvents[initialEvents.length - 1] || '')
  const [deviceType, setDeviceType] = useState<string>(searchParams.get('device_type') || '')

  const events = [startEvent, endEvent].filter(Boolean)

  const startDateParam = searchParams.get('start_date')
  const endDateParam = searchParams.get('end_date')

  const { data: eventsResponse } = useQuery({
    queryKey: ['events'],
    queryFn: () => fetchEvents(),
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

  // Sync filter state back to URL
  useEffect(() => {
    const current = Object.fromEntries(searchParams)
    const next: Record<string, string> = { ...current }
    if (events.length >= 2) next['events'] = events.join(',')
    if (deviceType) next['device_type'] = deviceType
    else delete next['device_type']
    setSearchParams(next)
  }, [startEvent, endEvent, deviceType])

  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined

  const {
    data: funnelData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['path-funnel', events.join(','), startDate, endDate, deviceType, selectedCountry, selectedBrowser],
    queryFn: () =>
      fetchPathFunnel({
        events,
        start_date: startDate,
        end_date: endDate,
        device_type: deviceType || undefined,
        country: selectedCountry || undefined,
        browser: selectedBrowser || undefined,
      }),
    enabled: events.length >= 2,
  })

  const steps = funnelData?.data || []

  const copyPermalink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (events.length < 2) {
    return (
      <PageTransition>
        <div className={SPACING.page}>
          <EmptyState
            icon={TrendingDown}
            title="No funnel specified"
            description="Add events to the URL to view a funnel analysis. Example: /funnel?events=Search,AddToCart,Purchase"
          />
        </div>
      </PageTransition>
    )
  }

  // Derived summary metrics
  const firstStep = steps[0]
  const lastStep = steps[steps.length - 1]
  const worstStep = steps
    .slice(1)
    .reduce<(typeof steps)[0] | null>(
      (worst, s) =>
        worst === null || s.step_conversion_rate < worst.step_conversion_rate ? s : worst,
      null
    )

  return (
    <TooltipProvider>
      <PageTransition>
        <div className={SPACING.page}>
          <div className={SPACING.section}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/paths')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className={TYPOGRAPHY.pageTitle}>Conversion Funnel</h1>
                  <p className="text-muted-foreground mt-1 text-sm font-mono">
                    {events.join(' → ')}
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
              {/* Start event */}
              <Select
                value={startEvent || 'any'}
                onValueChange={(v) => setStartEvent(v === 'any' ? '' : v)}
              >
                <SelectTrigger className={segTrigger} style={{ width: 'auto', minWidth: 0 }}>
                  <SelectValue placeholder="Any start" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any start</SelectItem>
                  {availableEvents.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Arrow divider */}
              <div className="flex items-center justify-center w-8 shrink-0 text-muted-foreground/40 pointer-events-none select-none">
                <ArrowRight className="h-3.5 w-3.5" />
              </div>

              {/* End event */}
              <Select
                value={endEvent || 'any'}
                onValueChange={(v) => setEndEvent(v === 'any' ? '' : v)}
              >
                <SelectTrigger className={segTrigger} style={{ width: 'auto', minWidth: 0 }}>
                  <SelectValue placeholder="Any end" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any end</SelectItem>
                  {availableEvents.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Device */}
              <Select
                value={deviceType || 'all'}
                onValueChange={(v) => setDeviceType(v === 'all' ? '' : v)}
              >
                <SelectTrigger className={cn(segTrigger, deviceType && 'text-foreground')} style={{ width: 'auto', minWidth: 0 }}>
                  {deviceType === 'Mobile' ? (
                    <Smartphone className="h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : deviceType === 'Desktop' ? (
                    <Monitor className="h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : null}
                  <SelectValue placeholder="All devices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All devices</SelectItem>
                  <SelectItem value="Mobile">
                    <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" />Mobile</span>
                  </SelectItem>
                  <SelectItem value="Desktop">
                    <span className="flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" />Desktop</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary cards (only when data is loaded) */}
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
                      {deviceType && (
                        <span className="text-primary"> · {deviceType}</span>
                      )}
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
                {isLoading ? (
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
                          Each step shows people who did <em>every prior step first</em>, in order
                        </li>
                        <li>Other events between steps are fine — no direct jump required</li>
                        <li>&quot;% of starters&quot; = people at this step ÷ people at step 1</li>
                        <li>
                          &quot;People left here&quot; = those who never continued to the next step
                        </li>
                      </ul>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageTransition>
    </TooltipProvider>
  )
}
