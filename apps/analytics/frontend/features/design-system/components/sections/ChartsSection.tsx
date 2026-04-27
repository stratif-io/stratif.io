import { ComponentSection, ComponentRow } from '../ComponentSection'
import {
  AreaChartComponent,
  BarChartComponent,
  LineChartComponent,
  DonutChart,
  FunnelChart,
  HeatmapChart,
  SparklineChart,
  ComparisonChart,
  generateHeatmapData,
  transformPeriodData,
} from '@/components/charts'

const timeSeriesData = [
  { date: '2024-01-01', value: 120 },
  { date: '2024-01-02', value: 95 },
  { date: '2024-01-03', value: 140 },
  { date: '2024-01-04', value: 88 },
  { date: '2024-01-05', value: 165 },
  { date: '2024-01-06', value: 130 },
  { date: '2024-01-07', value: 175 },
]

const barData = [
  { name: 'Mon', sessions: 80, users: 60 },
  { name: 'Tue', sessions: 110, users: 85 },
  { name: 'Wed', sessions: 95, users: 70 },
  { name: 'Thu', sessions: 140, users: 105 },
  { name: 'Fri', sessions: 125, users: 95 },
  { name: 'Sat', sessions: 60, users: 45 },
  { name: 'Sun', sessions: 50, users: 38 },
]

const lineData = [
  { day: 'Jan', pageviews: 400, clicks: 240 },
  { day: 'Feb', pageviews: 300, clicks: 139 },
  { day: 'Mar', pageviews: 600, clicks: 380 },
  { day: 'Apr', pageviews: 800, clicks: 430 },
  { day: 'May', pageviews: 500, clicks: 290 },
  { day: 'Jun', pageviews: 900, clicks: 520 },
  { day: 'Jul', pageviews: 750, clicks: 410 },
]

const donutData = [
  { name: 'Direct', value: 40 },
  { name: 'Organic', value: 30 },
  { name: 'Referral', value: 20 },
  { name: 'Social', value: 10 },
]

const funnelData = [
  { name: 'Visited', value: 1000 },
  { name: 'Signed up', value: 600 },
  { name: 'Activated', value: 300 },
  { name: 'Paid', value: 100 },
]

const heatmapData = generateHeatmapData((day, hour) => {
  const base = hour >= 9 && hour <= 17 ? 50 : 10
  const dayBoost = day < 5 ? 30 : 0
  return Math.floor(Math.random() * base + dayBoost)
})

const sparklineData = [12, 18, 14, 22, 19, 28, 24, 30, 26, 35]

const comparisonData = transformPeriodData([
  { label: 'Week 1', current: 400, previous: 320 },
  { label: 'Week 2', current: 380, previous: 350 },
  { label: 'Week 3', current: 520, previous: 410 },
  { label: 'Week 4', current: 610, previous: 480 },
  { label: 'Week 5', current: 590, previous: 500 },
  { label: 'Week 6', current: 700, previous: 530 },
])

const comparisonSeries = [
  { dataKey: 'current', name: 'Current', type: 'current' as const },
  { dataKey: 'previous', name: 'Previous', type: 'previous' as const },
]

export function ChartsSection() {
  return (
    <ComponentSection id="charts" title="Charts">
      <ComponentRow label="Area Chart">
        <div className="w-full h-48 border rounded-md p-2">
          <AreaChartComponent data={timeSeriesData} dataKey="value" name="Events" height={160} />
        </div>
      </ComponentRow>

      <ComponentRow label="Bar Chart">
        <div className="w-full h-48 border rounded-md p-2">
          <BarChartComponent
            data={barData}
            bars={[
              { dataKey: 'sessions', name: 'Sessions' },
              { dataKey: 'users', name: 'Users' },
            ]}
            xAxisKey="name"
            height={160}
          />
        </div>
      </ComponentRow>

      <ComponentRow label="Line Chart">
        <div className="w-full h-48 border rounded-md p-2">
          <LineChartComponent
            data={lineData}
            lines={[
              { dataKey: 'pageviews', name: 'Pageviews' },
              { dataKey: 'clicks', name: 'Clicks' },
            ]}
            xAxisKey="day"
            height={160}
          />
        </div>
      </ComponentRow>

      <ComponentRow label="Donut Chart">
        <div className="w-64 h-64 border rounded-md p-2">
          <DonutChart data={donutData} height={224} innerRadius={50} outerRadius={85} />
        </div>
      </ComponentRow>

      <ComponentRow label="Funnel Chart">
        <div className="w-full h-64 border rounded-md p-2">
          <FunnelChart data={funnelData} height={224} orientation="horizontal" />
        </div>
      </ComponentRow>

      <ComponentRow label="Heatmap Chart">
        <div className="w-full h-56 border rounded-md p-2 overflow-auto">
          <HeatmapChart data={heatmapData} height={200} cellSize={18} />
        </div>
      </ComponentRow>

      <ComponentRow label="Sparkline Chart">
        <div className="flex items-center gap-6 border rounded-md p-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Default</span>
            <SparklineChart data={sparklineData} width={120} height={40} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">With trend</span>
            <SparklineChart data={sparklineData} width={120} height={40} showTrend showDots />
          </div>
        </div>
      </ComponentRow>

      <ComponentRow label="Comparison Chart">
        <div className="w-full h-48 border rounded-md p-2">
          <ComparisonChart
            data={comparisonData}
            series={comparisonSeries}
            xAxisKey="name"
            height={160}
          />
        </div>
      </ComponentRow>
    </ComponentSection>
  )
}
