import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DbLogo } from '@/components/DbLogo'
import { SPACING } from '@/lib/constants'
import { ConnectionSetupLayout } from './components/ConnectionSetupLayout'
import { CredentialFields } from './components/ConnectionConfigTab'
import { buildCredentials } from './components/ConnectionConfigTab.helpers'
import { useCreateConnection, useTestConnection } from './hooks/useConnectionsData'
import { useAnalytics } from '@/lib/analytics'
import type { DbType } from '@/types'

const DB_TYPES: { value: DbType; label: string }[] = [
  { value: 'duckdb', label: 'DuckDB' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'databricks', label: 'Databricks' },
  { value: 'snowflake', label: 'Snowflake' },
  { value: 'clickhouse', label: 'ClickHouse' },
  { value: 'sqlite', label: 'SQLite' },
]

export function NewConnectionPage() {
  const navigate = useNavigate()
  const { track } = useAnalytics()
  const create = useCreateConnection()
  const test = useTestConnection()
  const formRef = useRef<HTMLFormElement>(null)

  const [name, setName] = useState('')
  const [dbType, setDbType] = useState<DbType>('duckdb')

  const testStatus = test.isPending
    ? 'testing'
    : test.data?.ok === true
      ? 'connected'
      : test.data?.ok === false || test.error
        ? 'failed'
        : 'idle'

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const credentials = buildCredentials(dbType, e.currentTarget)
    create.mutate(
      { name, db_type: dbType, credentials },
      {
        onSuccess: (conn) => {
          track('connection_created', { db_type: dbType })
          test.mutate(conn.id, {
            onSuccess: (result) => {
              if (result.ok) {
                navigate(`/connections/${conn.id}/table`)
              } else {
                navigate(`/connections/${conn.id}/credentials`)
              }
            },
            onError: () => navigate(`/connections/${conn.id}/credentials`),
          })
        },
      }
    )
  }

  return (
    <div className={SPACING.page}>
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          onClick={() => navigate('/connections')}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Connections
        </Button>
      </div>

      <ConnectionSetupLayout
        connectionName={name || 'New Connection'}
        dbType={dbType}
        testStatus={testStatus}
        currentStep="credentials"
        completedSteps={[]}
        onStepClick={() => {}}
      >
        {/* Test state banner */}
        <div
          className={
            testStatus === 'testing'
              ? 'flex items-center gap-2 px-4 py-3 text-sm text-blue-700 bg-blue-50 border-b'
              : testStatus === 'connected'
                ? 'flex items-center gap-2 px-4 py-3 text-sm text-green-700 bg-green-50 border-b'
                : testStatus === 'failed'
                  ? 'flex items-center gap-2 px-4 py-3 text-sm text-red-700 bg-red-50 border-b'
                  : 'hidden'
          }
        >
          {testStatus === 'testing' && <Loader2 className="h-4 w-4 animate-spin" />}
          {testStatus === 'connected' && <CheckCircle className="h-4 w-4" />}
          {testStatus === 'failed' && <XCircle className="h-4 w-4" />}
          <span>
            {testStatus === 'testing' && 'Testing connection…'}
            {testStatus === 'connected' && 'Connected — redirecting to table setup…'}
            {testStatus === 'failed' && 'Test failed — redirecting to credentials to fix…'}
          </span>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* DB type */}
            <div className="space-y-1.5">
              <Label>Database Type</Label>
              <Select value={dbType} onValueChange={(v) => setDbType(v as DbType)}>
                <SelectTrigger>
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <DbLogo dbType={dbType} size={16} />
                      {DB_TYPES.find((t) => t.value === dbType)?.label}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DB_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <DbLogo dbType={t.value} size={16} />
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="conn-name">Connection Name</Label>
              <Input
                id="conn-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Production DB"
                required
                maxLength={100}
              />
            </div>

            {/* Credentials */}
            <div className="rounded-md border p-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                Credentials
              </p>
              <CredentialFields dbType={dbType} fields={{}} />
            </div>

            {create.isError && <p className="text-sm text-destructive">{create.error?.message}</p>}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-4 py-3 border-t gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/connections')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={create.isPending || test.isPending || !name.trim()}
            >
              {create.isPending || test.isPending ? 'Creating…' : 'Create Connection'}
            </Button>
          </div>
        </form>
      </ConnectionSetupLayout>
    </div>
  )
}
