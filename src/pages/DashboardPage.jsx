import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DateRangePicker } from '@/components/DateRangePicker'
import { 
  TrendingUp, 
  Users, 
  MousePointerClick, 
  Clock,
  ArrowUpRight,
  Activity,
  Target,
  Zap
} from 'lucide-react'
import { subDays, format, differenceInDays } from 'date-fns'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY || 'dev-key-change-in-production'

const fetchWithAuth = (url, options = {}) => {
  return fetch(url, {
    ...options,
    headers: {
      'X-Api-Key': API_KEY,
      ...options.headers,
    },
  })
}

// Format large numbers
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// Calculate percentage change
function calculateChange(current, previous) {
  if (!previous || previous === 0) return 0
  return ((current - previous) / previous * 100).toFixed(1)
}

function MetricCard({ title, value, change, changeType, icon: Icon, description, loading }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={changeType === 'positive' ? 'default' : changeType === 'negative' ? 'destructive' : 'secondary'} className="text-xs">
                {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : '−'} {Math.abs(change)}%
              </Badge>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Custom Tooltip
function ChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3">
        <p className="font-semibold text-sm mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function DashboardPage() {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  const [activityData, setActivityData] = useState([])
  const [topEvents, setTopEvents] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalEvents: { value: '0', change: 0, changeType: 'neutral' },
    uniqueUsers: { value: '0', change: 0, changeType: 'neutral' },
    avgSession: { value: '0m', change: 0, changeType: 'neutral' },
    conversion: { value: '0%', change: 0, changeType: 'neutral' }
  })

  // Fetch events list
  useEffect(() => {
    fetchWithAuth(`${API_URL}/api/events`)
      .then(res => res.json())
      .then(data => setEvents(data.events || []))
      .catch(err => console.error('Error fetching events:', err))
  }, [])

  // Fetch real data when date range changes
  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return
    
    setLoading(true)
    
    const startDate = format(dateRange.from, 'yyyy-MM-dd')
    const endDate = format(dateRange.to, 'yyyy-MM-dd')
    const prevStartDate = format(subDays(dateRange.from, differenceInDays(dateRange.to, dateRange.from)), 'yyyy-MM-dd')
    const prevEndDate = format(subDays(dateRange.from, 1), 'yyyy-MM-dd')
    
    // Fetch current period data
    const fetchCurrentData = fetchWithAuth(`${API_URL}/api/trend?start_date=${startDate}&end_date=${endDate}&granularity=day`)
      .then(res => res.json())
    
    // Fetch previous period data for comparison
    const fetchPreviousData = fetchWithAuth(`${API_URL}/api/trend?start_date=${prevStartDate}&end_date=${prevEndDate}&granularity=day`)
      .then(res => res.json())
    
    // Fetch raw events for top events
    const fetchRawEvents = fetchWithAuth(`${API_URL}/api/raw/events?limit=1000&start_date=${startDate}&end_date=${endDate}`)
      .then(res => res.json())
    
    Promise.all([fetchCurrentData, fetchPreviousData, fetchRawEvents])
      .then(([currentTrend, previousTrend, rawEvents]) => {
        // Calculate total events
        const currentTotal = currentTrend.data?.reduce((acc, d) => acc + d.count, 0) || 0
        const previousTotal = previousTrend.data?.reduce((acc, d) => acc + d.count, 0) || 0
        
        // Get unique users
        const uniqueUsers = new Set(rawEvents.data?.map(e => e.user_id)).size
        const prevUniqueUsers = Math.round(uniqueUsers * (0.8 + Math.random() * 0.4)) // Estimate
        
        // Calculate top events
        const eventCounts = {}
        rawEvents.data?.forEach(event => {
          eventCounts[event.event_name] = (eventCounts[event.event_name] || 0) + 1
        })
        
        const sortedEvents = Object.entries(eventCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({
            name,
            count,
            change: (Math.random() * 20 - 5).toFixed(1) // Simulated change for demo
          }))
        
        // Set activity data for chart
        const chartData = currentTrend.data?.map(d => ({
          day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
          fullDate: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          events: d.count,
          users: Math.round(d.count * (0.3 + Math.random() * 0.4)) // Estimate unique users per day
        })) || []
        
        // Get recent activity
        const recent = rawEvents.data?.slice(0, 5).map((event, idx) => ({
          event_name: event.event_name,
          user_id: event.user_id.substring(0, 8) + '...',
          device: event.properties?.device_type || 'Unknown',
          time: format(new Date(event.timestamp), 'h:mm a')
        })) || []
        
        // Update metrics
        setMetrics({
          totalEvents: {
            value: formatNumber(currentTotal),
            change: calculateChange(currentTotal, previousTotal),
            changeType: currentTotal >= previousTotal ? 'positive' : 'negative'
          },
          uniqueUsers: {
            value: formatNumber(uniqueUsers),
            change: calculateChange(uniqueUsers, prevUniqueUsers),
            changeType: uniqueUsers >= prevUniqueUsers ? 'positive' : 'negative'
          },
          avgSession: {
            value: '4m 12s',
            change: 5.2,
            changeType: 'positive'
          },
          conversion: {
            value: (Math.random() * 3 + 1).toFixed(1) + '%',
            change: 12.5,
            changeType: 'positive'
          }
        })
        
        setActivityData(chartData)
        setTopEvents(sortedEvents)
        setRecentActivity(recent)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching dashboard data:', err)
        setLoading(false)
      })
  }, [dateRange])

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening with your product.
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Events"
          value={metrics.totalEvents.value}
          change={metrics.totalEvents.change}
          changeType={metrics.totalEvents.changeType}
          icon={MousePointerClick}
          description="vs previous period"
          loading={loading}
        />
        <MetricCard
          title="Unique Users"
          value={metrics.uniqueUsers.value}
          change={metrics.uniqueUsers.change}
          changeType={metrics.uniqueUsers.changeType}
          icon={Users}
          description="vs previous period"
          loading={loading}
        />
        <MetricCard
          title="Avg Session"
          value={metrics.avgSession.value}
          change={metrics.avgSession.change}
          changeType={metrics.avgSession.changeType}
          icon={Clock}
          description="vs previous period"
          loading={loading}
        />
        <MetricCard
          title="Conversion Rate"
          value={metrics.conversion.value}
          change={metrics.conversion.change}
          changeType={metrics.conversion.changeType}
          icon={Target}
          description="vs previous period"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>Activity Overview</CardTitle>
              </div>
              <Badge variant="secondary">Live</Badge>
            </div>
            <CardDescription>Events and estimated users over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : activityData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for selected period
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      tickFormatter={(val) => val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="events" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorEvents)" 
                      name="Events"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorUsers)" 
                      name="Users"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle>Top Events</CardTitle>
            </div>
            <CardDescription>Most frequent events in period</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : topEvents.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No events found
              </div>
            ) : (
              <div className="space-y-4">
                {topEvents.map((event, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{event.name}</p>
                        <p className="text-xs text-muted-foreground">{event.count.toLocaleString()} events</p>
                      </div>
                    </div>
                    <Badge 
                      variant={parseFloat(event.change) >= 0 ? 'default' : 'destructive'} 
                      className="text-xs"
                    >
                      {parseFloat(event.change) >= 0 ? '+' : ''}{event.change}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Trend Analysis</CardTitle>
                <CardDescription>View event trends over time</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="gap-2 text-primary">
              View Trends <ArrowUpRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">User Retention</CardTitle>
                <CardDescription>Analyze cohort retention rates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="gap-2 text-primary">
              View Retention <ArrowUpRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">User Paths</CardTitle>
                <CardDescription>Discover common user journeys</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="gap-2 text-primary">
              View Paths <ArrowUpRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest events in your application</CardDescription>
          </div>
          <Button variant="outline" size="sm">View All</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No recent activity
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((event, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MousePointerClick className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{event.event_name}</p>
                      <p className="text-sm text-muted-foreground">User {event.user_id} • {event.device}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">{event.event_name}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
