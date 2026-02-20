import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useUpdateConnection,
  useTestConnection,
  useConnectionString,
} from '../hooks/useConnectionsData'
import type { Connection, DbType } from '@/types'
import { CheckCircle, XCircle, Loader2, Copy, Check } from 'lucide-react'

interface Props {
  connection: Connection
}

function CredentialFields({ dbType }: { dbType: DbType }) {
  switch (dbType) {
    case 'duckdb':
      return (
        <div className="space-y-1.5">
          <Label htmlFor="file_path">File Path / S3 Path</Label>
          <Input id="file_path" name="file_path" placeholder="/path/to/db.duckdb or s3://…" />
        </div>
      )
    case 'sqlite':
      return (
        <div className="space-y-1.5">
          <Label htmlFor="file_path">File Path</Label>
          <Input id="file_path" name="file_path" placeholder="/path/to/db.sqlite" />
        </div>
      )
    case 'postgresql':
      return (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="host">Host</Label>
              <Input id="host" name="host" placeholder="localhost" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="port">Port</Label>
              <Input id="port" name="port" placeholder="5432" type="number" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="database">Database</Label>
            <Input id="database" name="database" placeholder="mydb" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="user">User</Label>
              <Input id="user" name="user" placeholder="postgres" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" />
            </div>
          </div>
        </>
      )
    case 'databricks':
      return (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="host">Workspace Host</Label>
            <Input id="host" name="host" placeholder="adb-xxxx.azuredatabricks.net" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="http_path">HTTP Path</Label>
            <Input id="http_path" name="http_path" placeholder="/sql/1.0/warehouses/…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="token">Access Token</Label>
            <Input id="token" name="token" type="password" placeholder="dapiXXXXXXXX" />
          </div>
        </>
      )
  }
}

function buildCredentials(dbType: DbType, form: HTMLFormElement): Record<string, unknown> {
  const data = new FormData(form)
  switch (dbType) {
    case 'duckdb': {
      const path = (data.get('file_path') as string) || ''
      return path.startsWith('s3://') ? { s3_path: path } : { file_path: path }
    }
    case 'sqlite':
      return { file_path: data.get('file_path') as string }
    case 'postgresql':
      return {
        host: data.get('host') as string,
        port: parseInt(data.get('port') as string) || 5432,
        database: data.get('database') as string,
        user: data.get('user') as string,
        password: data.get('password') as string,
      }
    case 'databricks':
      return {
        host: data.get('host') as string,
        http_path: data.get('http_path') as string,
        token: data.get('token') as string,
      }
  }
}

function ConnectionStringDisplay({ connId }: { connId: string }) {
  const { data } = useConnectionString(connId)
  const [copied, setCopied] = useState(false)
  const value = data?.connection_string

  if (!value) return null

  function handleCopy() {
    navigator.clipboard.writeText(value!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Connection String</h3>
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
        <code className="flex-1 text-xs font-mono text-muted-foreground break-all">{value}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          title="Copy"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}

export function ConnectionConfigTab({ connection }: Props) {
  const [name, setName] = useState(connection.name)
  const update = useUpdateConnection(connection.id)
  const testMutation = useTestConnection()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const credentials = buildCredentials(connection.db_type, form)

    // Only include credentials if at least one field was filled in
    const hasCredentials = Object.values(credentials).some((v) => v !== '' && v !== null)

    update.mutate({
      name: name.trim() || connection.name,
      ...(hasCredentials && { credentials }),
    })
  }

  function handleTest() {
    testMutation.mutate(connection.id)
  }

  const testResult = testMutation.data
  const testError = testMutation.error

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Connection Name</h3>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Production DB"
          required
        />
      </div>

      {/* Connection string (DuckDB / SQLite only) */}
      {(connection.db_type === 'duckdb' || connection.db_type === 'sqlite') && (
        <ConnectionStringDisplay connId={connection.id} />
      )}

      {/* Credentials */}
      <div className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Credentials</h3>
          <p className="text-xs text-muted-foreground">
            Credentials are encrypted at rest and never returned by the API. Leave fields blank to
            keep the existing credentials unchanged.
          </p>
        </div>
        <div className="rounded-md border p-4 space-y-3">
          <CredentialFields dbType={connection.db_type} />
        </div>
      </div>

      {/* Test connection */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTest}
          disabled={testMutation.isPending}
        >
          {testMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Test Connection
        </Button>
        {testResult && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Connected ({testResult.db_type})
          </span>
        )}
        {testError && (
          <span className="flex items-center gap-1.5 text-sm text-destructive">
            <XCircle className="h-4 w-4" />
            {testError.message}
          </span>
        )}
      </div>

      {update.isError && <p className="text-sm text-destructive">{update.error?.message}</p>}
      {update.isSuccess && <p className="text-sm text-green-600">Connection updated.</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
