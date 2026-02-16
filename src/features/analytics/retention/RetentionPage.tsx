import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { useAppStore } from '@/stores'
import { useRetentionData } from './hooks/useRetentionData'
import { RetentionChart } from './components/RetentionChart'
import { RetentionTable } from './components/RetentionTable'

export function RetentionPage() {
  const { dateRange } = useAppStore()

  const { retentionData, chartData, isLoading, avgDay1, avgDay7, avgDay30, totalCohorts } =
    useRetentionData({
      dateRange,
    })

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Retention Analysis</h1>
        <p className="text-muted-foreground mt-1">User retention by signup cohort</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Day 1 Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDay1.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Day 7 Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDay7.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Day 30 Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDay30.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cohorts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCohorts}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Cohort Retention Over Time</CardTitle>
          </div>
          <CardDescription>Percentage of users returning after signup</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[350px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <RetentionChart data={chartData} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Cohort Table</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <RetentionTable data={retentionData} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
