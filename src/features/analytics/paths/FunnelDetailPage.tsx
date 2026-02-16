import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ChevronDown,
  HelpCircle,
  Info,
  TrendingDown,
  Users,
  Copy,
  Check,
  ArrowLeft,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchPathFunnel } from '@/lib/api'
import { useAppStore } from '@/stores'
import { DateRangePicker } from '@/components/DateRangePicker'

export function FunnelDetailPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { dateRange, setDateRange } = useAppStore()
  const [methodologyOpen, setMethodologyOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const eventsParam = searchParams.get('events') || ''
  const events = eventsParam.split(',').filter(Boolean)
  const startDateParam = searchParams.get('start_date')
  const endDateParam = searchParams.get('end_date')

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

  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined

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
    enabled: events.length >= 2,
  })

  const steps = funnelData?.data || []

  const formatSequence = (upToIndex: number) => {
    return events.slice(0, upToIndex + 1).join(' → ')
  }

  const copyPermalink = async () => {
    const url = window.location.href
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (events.length < 2) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Funnel Specified</h2>
              <p className="text-muted-foreground mb-4">
                Add events to the URL to view a funnel analysis.
              </p>
              <p className="text-sm text-muted-foreground">
                Example:{' '}
                <code className="bg-muted px-2 py-1 rounded">
                  /funnel?events=Search,AddToCart,Purchase
                </code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/paths')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Funnel Analysis</h1>
              <p className="text-muted-foreground mt-1">
                <span className="font-mono text-sm">{events.join(' → ')}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
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
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>
                  Track user progression through each step of the funnel
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
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

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(events.length)].map((_, i) => (
                  <div key={i} className="space-y-2 p-4 rounded-lg border">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-sm text-red-500 text-center py-4">Error loading funnel data</div>
            ) : steps.length > 0 ? (
              <div className="space-y-4">
                {steps.map((step, idx) => (
                  <div key={idx} className="space-y-2 p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={idx === 0 ? 'default' : 'secondary'}
                          className="text-base px-3 py-1"
                        >
                          Step {step.step}
                        </Badge>
                        <span className="font-medium text-lg">{step.event}</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-muted-foreground cursor-help">
                              <span className="font-semibold text-foreground text-lg">
                                {step.occurrences.toLocaleString()}
                              </span>{' '}
                              occurrences
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Total times this event occurred, regardless of funnel position</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-muted-foreground cursor-help">
                              <Users className="h-4 w-4" />
                              <span className="font-semibold text-foreground text-lg">
                                {step.users.toLocaleString()}
                              </span>
                              <span>users</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Users who completed the full sequence up to this step</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {step.users.toLocaleString()} users completed{' '}
                      <span className="font-mono font-medium text-foreground">
                        {formatSequence(idx)}
                      </span>{' '}
                      in order
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={step.overall_conversion_rate} className="h-3 flex-1" />
                      <span className="text-sm font-medium w-20 text-right">
                        {step.overall_conversion_rate}%
                      </span>
                    </div>
                    {idx > 0 && (
                      <div className="flex items-center justify-between text-sm pt-1">
                        <span className="text-muted-foreground">
                          Step conversion:{' '}
                          <span className="text-foreground font-semibold">
                            {step.step_conversion_rate}%
                          </span>
                        </span>
                        {step.dropoff_users > 0 && (
                          <span className="text-red-500 font-medium">
                            −{step.dropoff_users.toLocaleString()} users ({step.dropoff_rate}%)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No funnel data available
              </div>
            )}

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
                    <li>
                      For each step, the <strong>first occurrence after the previous step</strong>{' '}
                      is used
                    </li>
                    <li>Intermediate events between funnel steps are allowed</li>
                    <li>
                      <strong>Drop-off</strong> = users who reached previous step but not this step
                    </li>
                  </ul>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
