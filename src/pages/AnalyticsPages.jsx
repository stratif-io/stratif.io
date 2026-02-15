import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DateRangePicker } from '@/components/DateRangePicker'
import { TrendingUp, Users, Route, ArrowRight, BarChart3, LineChart as LineChartIcon } from 'lucide-react'
import { format, subDays, parseISO } from 'date-fns'
import { Progress } from '@/components/ui/progress'
import { Smartphone, Monitor } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
  Brush,
} from 'recharts'
import { cn } from '@/lib/utils'

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

// Helper to format date
const formatDate = (date) => {
  if (!date) return ''
  return format(date, 'yyyy-MM-dd')
}

// Custom Tooltip Component for Charts
function CustomTooltip({ active, payload, label, valueLabel = 'Events' }) {
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

function PathAnalysisContent({ targetEvent, startDate, endDate }) {
  const [pathData, setPathData] = useState([])
  const [deviceType, setDeviceType] = useState('')
  const [loading, setLoading] = useState(false)
  const [totalOccurrences, setTotalOccurrences] = useState(0)

  useEffect(() => {
    if (!targetEvent || !startDate || !endDate) return

    setLoading(true)
    const params = new URLSearchParams()
    params.append('target_event', targetEvent)
    if (deviceType) params.append('device_type', deviceType)
    params.append('start_date', startDate)
    params.append('end_date', endDate)
    params.append('limit', '5')

    fetchWithAuth(`${API_URL}/api/paths?${params}`)
      .then(res => res.json())
      .then(data => {
        setPathData(data.data || [])
        setTotalOccurrences(data.total_occurrences || 0)
      })
      .catch(err => console.error('Error fetching paths:', err))
      .finally(() => setLoading(false))
  }, [targetEvent, deviceType, startDate, endDate])

  const getRankColor = (idx) => {
    if (idx === 0) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
    if (idx === 1) return 'bg-gray-400/10 text-gray-600 border-gray-400/20'
    if (idx === 2) return 'bg-orange-700/10 text-orange-700 border-orange-700/20'
    return 'bg-muted text-muted-foreground'
  }

  const getDeviceIcon = (type) => {
    return type === 'Mobile' ? (
      <Smartphone className="h-4 w-4 mr-1" />
    ) : (
      <Monitor className="h-4 w-4 mr-1" />
    )
  }

  // Prepare data for bar chart
  const chartData = pathData.map((path, idx) => ({
    name: `${path.step_3} → ${path.step_2} → ${path.step_1}`,
    count: path.count,
    percentage: path.percentage,
    fullPath: path,
    rank: idx + 1
  }))

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (pathData.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-muted-foreground">
        No paths found for "{targetEvent}"
      </div>
    )
  }

  const maxCount = Math.max(...pathData.map(p => p.count))

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{totalOccurrences.toLocaleString()}</span> total occurrences
        </div>
        <Select value={deviceType || "all"} onValueChange={(val) => setDeviceType(val === "all" ? "" : val)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Devices" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Devices</SelectItem>
            <SelectItem value="Mobile">Mobile</SelectItem>
            <SelectItem value="Desktop">Desktop</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Interactive Bar Chart */}
      <Card className="p-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Path Popularity
          </CardTitle>
          <CardDescription>Top 5 paths leading to {targetEvent}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={(val) => val.toLocaleString()} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={150}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-popover border rounded-lg shadow-lg p-3 max-w-xs">
                          <p className="font-semibold text-sm mb-1">Rank #{data.rank}</p>
                          <p className="text-xs text-muted-foreground mb-2">{data.fullPath.path}</p>
                          <p className="text-sm font-medium">{data.count.toLocaleString()} events</p>
                          <p className="text-xs text-muted-foreground">{data.percentage}% of total</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                  name="Event Count"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Device</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pathData.map((path, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Badge variant="outline" className={`${getRankColor(idx)}`}>
                      #{idx + 1}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 font-mono text-sm">
                      <span className="text-muted-foreground">{path.step_3}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{path.step_2}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span>{path.step_1}</span>
                      <ArrowRight className="h-3 w-3 text-primary" />
                      <span className="font-semibold text-primary">{path.target}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {getDeviceIcon(path.device_type)}
                      <span className="text-sm">{path.device_type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {path.count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{path.percentage}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export function TrendsPage() {
  const [trendData, setTrendData] = useState([])
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState('')
  const [granularity, setGranularity] = useState('day')
  const [loading, setLoading] = useState(false)
  const [chartType, setChartType] = useState('area')
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  useEffect(() => {
    fetchWithAuth(`${API_URL}/api/events`)
      .then(res => res.json())
      .then(data => setEvents(data.events || []))
      .catch(err => console.error('Error fetching events:', err))
  }, [])

  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return
    
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedEvent) params.append('event_name', selectedEvent)
    params.append('granularity', granularity)
    params.append('start_date', formatDate(dateRange.from))
    params.append('end_date', formatDate(dateRange.to))

    fetchWithAuth(`${API_URL}/api/trend?${params}`)
      .then(res => res.json())
      .then(data => {
        setTrendData(data.data.map(d => ({
          date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: d.date,
          count: d.count
        })))
      })
      .catch(err => console.error('Error fetching trend:', err))
      .finally(() => setLoading(false))
  }, [selectedEvent, granularity, dateRange])

  const averageValue = trendData.length > 0 
    ? Math.round(trendData.reduce((acc, d) => acc + d.count, 0) / trendData.length)
    : 0

  const maxValue = trendData.length > 0 
    ? Math.max(...trendData.map(d => d.count))
    : 0

  const renderChart = () => {
    if (!trendData.length) return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )

    const chartProps = {
      data: trendData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis 
              tickFormatter={(val) => val.toLocaleString()}
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip content={<CustomTooltip valueLabel={selectedEvent || 'Events'} />} />
            <Legend />
            <ReferenceLine y={averageValue} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              name={selectedEvent || 'All Events'}
            />
            <Brush dataKey="date" height={30} stroke="hsl(var(--primary))" />
          </LineChart>
        </ResponsiveContainer>
      )
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart {...chartProps}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis 
            tickFormatter={(val) => val.toLocaleString()}
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip content={<CustomTooltip valueLabel={selectedEvent || 'Events'} />} />
          <Legend />
          <ReferenceLine 
            y={averageValue} 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="3 3" 
            label={{ value: `Avg: ${averageValue.toLocaleString()}`, position: 'right', fill: 'hsl(var(--muted-foreground))' }}
          />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorCount)"
            name={selectedEvent || 'All Events'}
          />
          <Brush dataKey="date" height={30} stroke="hsl(var(--primary))" />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trend Analysis</h1>
          <p className="text-muted-foreground mt-1">Analyze event trends over time</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trendData.reduce((acc, d) => acc + d.count, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Events per day</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Day</CardTitle>
            <LineChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maxValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Maximum events in a day</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Event Trends</CardTitle>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center border rounded-md p-1">
                <Button
                  variant={chartType === 'area' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('area')}
                  className="h-7"
                >
                  Area
                </Button>
                <Button
                  variant={chartType === 'line' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('line')}
                  className="h-7"
                >
                  Line
                </Button>
              </div>
              <Select value={selectedEvent || "all"} onValueChange={(val) => setSelectedEvent(val === "all" ? "" : val)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events.map(event => (
                    <SelectItem key={event} value={event}>{event}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={granularity} onValueChange={setGranularity}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[450px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="h-[450px]">
              {renderChart()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function RetentionPage() {
  const [retentionData, setRetentionData] = useState([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 90),
    to: new Date(),
  })

  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return
    
    setLoading(true)
    const params = new URLSearchParams()
    params.append('start_date', formatDate(dateRange.from))
    params.append('end_date', formatDate(dateRange.to))
    
    fetchWithAuth(`${API_URL}/api/retention?${params}`)
      .then(res => res.json())
      .then(data => setRetentionData(data.data || []))
      .catch(err => console.error('Error fetching retention:', err))
      .finally(() => setLoading(false))
  }, [dateRange])

  // Prepare data for heatmap-style chart
  const chartData = retentionData.map(row => ({
    cohort: new Date(row.cohort_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    users: row.cohort_size,
    day0: row.day_0_percent,
    day1: row.day_1_percent,
    day7: row.day_7_percent,
    day14: row.day_14_percent,
    day30: row.day_30_percent,
  }))

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retention Analysis</h1>
          <p className="text-muted-foreground mt-1">User retention by signup cohort</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Day 1 Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {retentionData.length > 0 
                ? (retentionData.reduce((acc, r) => acc + r.day_1_percent, 0) / retentionData.length).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Day 7 Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {retentionData.length > 0 
                ? (retentionData.reduce((acc, r) => acc + r.day_7_percent, 0) / retentionData.length).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Day 30 Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {retentionData.length > 0 
                ? (retentionData.reduce((acc, r) => acc + r.day_30_percent, 0) / retentionData.length).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cohorts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{retentionData.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Retention Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Cohort Retention Over Time</CardTitle>
          </div>
          <CardDescription>Percentage of users returning after signup</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[350px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="cohort" 
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    tickFormatter={(val) => `${val}%`}
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border rounded-lg shadow-lg p-3">
                            <p className="font-semibold text-sm mb-2">{label}</p>
                            {payload.map((entry, index) => (
                              <p key={index} className="text-sm" style={{ color: entry.color }}>
                                {entry.name}: {entry.value}%
                              </p>
                            ))}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="day0" name="Day 0" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="day1" name="Day 1" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="day7" name="Day 7" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="day14" name="Day 14" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="day30" name="Day 30" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              No retention data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Cohort Table</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cohort Date</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Day 0</TableHead>
                  <TableHead>Day 1</TableHead>
                  <TableHead>Day 7</TableHead>
                  <TableHead>Day 14</TableHead>
                  <TableHead>Day 30</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retentionData.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{new Date(row.cohort_date).toLocaleDateString()}</TableCell>
                    <TableCell>{row.cohort_size}</TableCell>
                    <TableCell>
                      <Badge variant={row.day_0_percent >= 80 ? 'default' : row.day_0_percent >= 50 ? 'secondary' : 'destructive'}>
                        {row.day_0_percent}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.day_1_percent >= 40 ? 'default' : row.day_1_percent >= 20 ? 'secondary' : 'destructive'}>
                        {row.day_1_percent}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.day_7_percent >= 20 ? 'default' : row.day_7_percent >= 10 ? 'secondary' : 'destructive'}>
                        {row.day_7_percent}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.day_14_percent >= 15 ? 'default' : row.day_14_percent >= 8 ? 'secondary' : 'destructive'}>
                        {row.day_14_percent}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.day_30_percent >= 10 ? 'default' : row.day_30_percent >= 5 ? 'secondary' : 'destructive'}>
                        {row.day_30_percent}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function PathsPage() {
  const [events, setEvents] = useState([])
  const [pathTargetEvent, setPathTargetEvent] = useState('Purchase')
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  useEffect(() => {
    fetchWithAuth(`${API_URL}/api/events`)
      .then(res => res.json())
      .then(data => setEvents(data.events || []))
      .catch(err => console.error('Error fetching events:', err))
  }, [])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Path Analysis</h1>
          <p className="text-muted-foreground mt-1">Discover user journeys leading to key events</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Reverse Path Analysis</CardTitle>
                <CardDescription>Most common paths leading to a target event</CardDescription>
              </div>
            </div>
            <Select value={pathTargetEvent} onValueChange={setPathTargetEvent}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select target event" />
              </SelectTrigger>
              <SelectContent>
                {events.map(event => (
                  <SelectItem key={event} value={event}>{event}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <PathAnalysisContent 
            targetEvent={pathTargetEvent}
            startDate={formatDate(dateRange.from)}
            endDate={formatDate(dateRange.to)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
