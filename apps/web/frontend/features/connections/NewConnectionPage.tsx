import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
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
import { useCreateConnection } from './hooks/useConnectionsData'
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

function CredentialFields({ dbType }: { dbType: DbType }) {
  switch (dbType) {
    case 'duckdb':
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="file_path">File Path / S3 Path</Label>
            <Input
              id="file_path"
              name="file_path"
              placeholder="/path/to/db.duckdb or s3://..."
              required
            />
          </div>
        </div>
      )
    case 'sqlite':
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="file_path">File Path</Label>
            <Input id="file_path" name="file_path" placeholder="/path/to/db.sqlite" required />
          </div>
        </div>
      )
    case 'postgresql':
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="host">Host</Label>
              <Input id="host" name="host" placeholder="localhost" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                name="port"
                placeholder="5432"
                type="number"
                min={1}
                max={65535}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="database">Database</Label>
            <Input id="database" name="database" placeholder="mydb" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="user">User</Label>
              <Input id="user" name="user" placeholder="postgres" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
        </div>
      )
    case 'databricks':
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="host">Workspace Host</Label>
            <Input id="host" name="host" placeholder="adb-xxxx.azuredatabricks.net" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="http_path">HTTP Path</Label>
            <Input id="http_path" name="http_path" placeholder="/sql/1.0/warehouses/..." required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="token">Access Token</Label>
            <Input id="token" name="token" type="password" placeholder="dapiXXXXXXXX" required />
          </div>
        </div>
      )
    case 'snowflake':
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="account">Account</Label>
            <Input id="account" name="account" placeholder="xy12345.us-east-1" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="user">User</Label>
              <Input id="user" name="user" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="warehouse">Warehouse</Label>
            <Input id="warehouse" name="warehouse" placeholder="COMPUTE_WH" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="database">Database</Label>
              <Input id="database" name="database" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schema">Schema</Label>
              <Input id="schema" name="schema" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">
              Role <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input id="role" name="role" placeholder="ACCOUNTADMIN" />
          </div>
        </div>
      )
    case 'clickhouse':
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="host">Host</Label>
              <Input id="host" name="host" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                name="port"
                placeholder="8443"
                type="number"
                min={1}
                max={65535}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="database">Database</Label>
            <Input id="database" name="database" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="user">User</Label>
              <Input id="user" name="user" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input id="secure" name="secure" type="checkbox" defaultChecked className="h-4 w-4" />
            <Label htmlFor="secure">Use TLS (secure)</Label>
          </div>
        </div>
      )
  }
}

function buildCredentials(dbType: DbType, form: HTMLFormElement): Record<string, unknown> {
  const data = new FormData(form)
  switch (dbType) {
    case 'duckdb': {
      const path = data.get('file_path') as string
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
    case 'snowflake': {
      const role = data.get('role') as string
      const creds: Record<string, unknown> = {
        account: data.get('account') as string,
        user: data.get('user') as string,
        password: data.get('password') as string,
        warehouse: data.get('warehouse') as string,
        database: data.get('database') as string,
        schema: data.get('schema') as string,
      }
      if (role) creds.role = role
      return creds
    }
    case 'clickhouse': {
      const secureEl = form.elements.namedItem('secure') as HTMLInputElement | null
      return {
        host: data.get('host') as string,
        port: parseInt(data.get('port') as string) || 8443,
        database: data.get('database') as string,
        user: data.get('user') as string,
        password: data.get('password') as string,
        secure: secureEl?.checked ?? true,
      }
    }
    default:
      return {}
  }
}

export function NewConnectionPage() {
  const navigate = useNavigate()
  const { track } = useAnalytics()
  const create = useCreateConnection()
  const [dbType, setDbType] = useState<DbType>('duckdb')
  const [name, setName] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const credentials = buildCredentials(dbType, e.currentTarget)
    create.mutate(
      { name, db_type: dbType, credentials },
      {
        onSuccess: (conn) => {
          track('connection_created', { db_type: dbType })
          navigate(`/connections/${conn.id}/credentials`)
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

      <div className="max-w-md">
        <div className="mb-6">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <DbLogo dbType={dbType} size={22} />
            New Connection
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your event database to start exploring your analytics.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Connection Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Production DB"
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Database Type</Label>
            <Select value={dbType} onValueChange={(v) => setDbType(v as DbType)}>
              <SelectTrigger>
                <SelectValue />
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

          <div className="rounded-md border p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground tracking-wide">Credentials</p>
            <CredentialFields dbType={dbType} />
          </div>

          {create.isError && <p className="text-sm text-destructive">{create.error?.message}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/connections')}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
