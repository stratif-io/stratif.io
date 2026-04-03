import { useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useReport } from '@/lib/api/reports'

export function ReportPage() {
  const { shortcode } = useParams<{ shortcode: string }>()
  const { data: report, isLoading, error } = useReport(shortcode ?? '')

  useEffect(() => {
    if (report) {
      document.title = `${report.name} — stratif.io`
    }
  }, [report])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Report not found</h1>
          <p className="text-muted-foreground mb-4">
            This report could not be found or may have been removed.
          </p>
          <Button asChild variant="outline">
            <a href="/">Go to stratif.io</a>
          </Button>
        </div>
      </div>
    )
  }

  const snapshotDate = new Date(report.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const isLive = !report.snapshot || !report.snapshot_data

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1 text-muted-foreground">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-semibold break-words">{report.name}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Shared by {report.created_by_username} · Snapshot from {snapshotDate}
                  </p>
                </div>
              </div>
              <Badge variant={isLive ? 'outline' : 'default'}>
                {isLive ? 'Live data' : 'Snapshot'}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Chart Area Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {report.page.charAt(0).toUpperCase() + report.page.slice(1)}
              </h2>
              <Badge variant="secondary">Read only</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] sm:h-[380px] lg:h-[450px] flex items-center justify-center border border-dashed rounded-lg bg-muted/30">
              {isLive ? (
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">Live data</p>
                  <p className="text-sm text-muted-foreground">Open in app to view</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-muted-foreground">Chart placeholder</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>
            Powered by{' '}
            <a href="/" className="text-primary hover:underline font-medium">
              stratif.io
            </a>{' '}
            ·{' '}
            <a
              href={`/${report.page}`}
              className="text-primary hover:underline font-medium"
              aria-label="Open in app"
            >
              Open in app →
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
