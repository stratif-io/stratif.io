import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageTransition } from '@/components/layout/PageTransition'
import { LoadingState, ChartSkeleton, TableSkeleton } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Users } from 'lucide-react'
import { useAppStore } from '@/stores'
import { useRetentionData } from './hooks/useRetentionData'
import { RetentionChart } from './components/RetentionChart'
import { RetentionTable } from './components/RetentionTable'
import { SPACING, TYPOGRAPHY, ICON_SIZES } from '@/lib/constants'

export function RetentionPage() {
  const { dateRange } = useAppStore()

  const { retentionData, chartData, isLoading, avgDay1, avgDay7, avgDay30, totalCohorts } =
    useRetentionData({
      dateRange,
    })

  return (
    <PageTransition>
      <div className={SPACING.page}>
        <div className={SPACING.section}>
          <div>
            <h1 className={TYPOGRAPHY.pageTitle}>Retention Analysis</h1>
            <p className={`${TYPOGRAPHY.muted} mt-1`}>User retention by signup cohort</p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card hover="lift">
              <CardHeader className="pb-2">
                <CardTitle className={TYPOGRAPHY.label}>Avg Day 1 Retention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={TYPOGRAPHY.metric}>{avgDay1.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card hover="lift">
              <CardHeader className="pb-2">
                <CardTitle className={TYPOGRAPHY.label}>Avg Day 7 Retention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={TYPOGRAPHY.metric}>{avgDay7.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card hover="lift">
              <CardHeader className="pb-2">
                <CardTitle className={TYPOGRAPHY.label}>Avg Day 30 Retention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={TYPOGRAPHY.metric}>{avgDay30.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card hover="lift">
              <CardHeader className="pb-2">
                <CardTitle className={TYPOGRAPHY.label}>Total Cohorts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={TYPOGRAPHY.metric}>{totalCohorts}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className={`${ICON_SIZES.md} text-primary`} />
                <CardTitle>Cohort Retention Over Time</CardTitle>
              </div>
              <CardDescription>Percentage of users returning after signup</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton height="h-[350px]" />
              ) : chartData.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No retention data available"
                  description="Try adjusting your date range to see retention data."
                  className="h-[350px]"
                />
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
                <TableSkeleton />
              ) : retentionData.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No cohort data available"
                  description="Try adjusting your date range to see cohort data."
                />
              ) : (
                <RetentionTable data={retentionData} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  )
}
