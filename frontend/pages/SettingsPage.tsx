import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SPACING } from '@/lib/constants'

export function SettingsPage() {
  return (
    <div className={SPACING.page}>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Settings</h1>
      <div className="max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              stratif.io Analytics is configured via environment variables. See{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.example</code> for
              available options.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <code className="text-foreground">STRATIFIO_DB_URL</code> — Analytics database URL
              </p>
              <p>
                <code className="text-foreground">STRATIFIO_DB_TYPE</code> — Database type (duckdb,
                sqlite, postgres)
              </p>
              <p>
                <code className="text-foreground">STRATIFIO_API_KEY</code> — Optional API key for
                dashboard access
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
