import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useUpdateConnection,
  useTestConnection,
  useConnectionString,
  useConnectionCredentials,
} from '../hooks/useConnectionsData'
import type { Connection, DbType } from '@/types'
import { CheckCircle, XCircle, Loader2, Copy, Check, Eye, EyeOff } from 'lucide-react'
import { SaveStatus } from '@/components/ui/save-status'
import { TYPOGRAPHY } from '@/lib/constants'

interface Props {
  connection: Connection
}

// ---------------------------------------------------------------------------
// Masked input — shows •••• for sensitive fields that are already set
// ---------------------------------------------------------------------------

interface MaskedInputProps {
  id: string
  name: string
  placeholder: string
  initialValue: string | null // null = not set, MASKED = set but hidden
}

export function MaskedInput({ id, name, placeholder, initialValue }: MaskedInputProps) {
  const hasServerValue = initialValue !== null && initialValue !== undefined && initialValue !== ''
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)

  useEffect(() => {
    setValue('')
  }, [initialValue])

  const displayType = show ? 'text' : 'password'

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={displayType}
        placeholder={hasServerValue ? 'Leave blank to keep current' : placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pr-9 font-mono"
        // data-masked signals buildCredentials to skip this field when blank
        data-masked={value === '' ? 'true' : undefined}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      {hasServerValue && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
          Currently set — leave blank to keep
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Plain (non-sensitive) input pre-populated with current value
// ---------------------------------------------------------------------------

interface PlainInputProps {
  id: string
  name: string
  placeholder: string
  initialValue: string | null
  type?: string
}

function PlainInput({ id, name, placeholder, initialValue, type = 'text' }: PlainInputProps) {
  const [value, setValue] = useState(initialValue ?? '')

  useEffect(() => {
    setValue(initialValue ?? '')
  }, [initialValue])

  return (
    <Input
      id={id}
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  )
}

// ---------------------------------------------------------------------------
// Per-db-type credential fields
// ---------------------------------------------------------------------------

interface CredentialFieldsProps {
  dbType: DbType
  fields: Record<string, string | null>
  onCheckboxChange?: () => void
}

export function CredentialFields({ dbType, fields, onCheckboxChange }: CredentialFieldsProps) {
  const f = fields

  switch (dbType) {
    case 'duckdb':
      return (
        <div className="space-y-1.5">
          <Label htmlFor="file_path">File Path / S3 Path</Label>
          <PlainInput
            id="file_path"
            name="file_path"
            placeholder="/path/to/db.duckdb or s3://…"
            initialValue={f.file_path ?? f.s3_path ?? null}
          />
        </div>
      )

    case 'sqlite':
      return (
        <div className="space-y-1.5">
          <Label htmlFor="file_path">File Path</Label>
          <PlainInput
            id="file_path"
            name="file_path"
            placeholder="/path/to/db.sqlite"
            initialValue={f.file_path ?? null}
          />
        </div>
      )

    case 'postgresql':
      return (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="host">Host</Label>
              <PlainInput
                id="host"
                name="host"
                placeholder="localhost"
                initialValue={f.host ?? null}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="port">Port</Label>
              <PlainInput
                id="port"
                name="port"
                placeholder="5432"
                type="number"
                initialValue={f.port ?? null}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="database">Database</Label>
            <PlainInput
              id="database"
              name="database"
              placeholder="mydb"
              initialValue={f.database ?? null}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="user">User</Label>
              <PlainInput
                id="user"
                name="user"
                placeholder="postgres"
                initialValue={f.user ?? null}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <MaskedInput
                id="password"
                name="password"
                placeholder="••••••••"
                initialValue={f.password ?? null}
              />
            </div>
          </div>
        </>
      )

    case 'databricks':
      return (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="host">Workspace Host</Label>
            <PlainInput
              id="host"
              name="host"
              placeholder="adb-xxxx.azuredatabricks.net"
              initialValue={f.host ?? null}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="http_path">HTTP Path</Label>
            <PlainInput
              id="http_path"
              name="http_path"
              placeholder="/sql/1.0/warehouses/…"
              initialValue={f.http_path ?? null}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="token">Access Token</Label>
            <MaskedInput
              id="token"
              name="token"
              placeholder="dapiXXXXXXXX"
              initialValue={f.token ?? null}
            />
          </div>
        </>
      )

    case 'snowflake':
      return (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="account">Account</Label>
            <PlainInput
              id="account"
              name="account"
              placeholder="xy12345.us-east-1"
              initialValue={f.account ?? null}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="user">User</Label>
              <PlainInput id="user" name="user" placeholder="" initialValue={f.user ?? null} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <MaskedInput
                id="password"
                name="password"
                placeholder="••••••••"
                initialValue={f.password ?? null}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="warehouse">Warehouse</Label>
            <PlainInput
              id="warehouse"
              name="warehouse"
              placeholder="COMPUTE_WH"
              initialValue={f.warehouse ?? null}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="database">Database</Label>
              <PlainInput
                id="database"
                name="database"
                placeholder=""
                initialValue={f.database ?? null}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schema">Schema</Label>
              <PlainInput
                id="schema"
                name="schema"
                placeholder=""
                initialValue={f.schema ?? null}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">
              Role <span className="text-muted-foreground">(optional)</span>
            </Label>
            <PlainInput
              id="role"
              name="role"
              placeholder="ACCOUNTADMIN"
              initialValue={f.role ?? null}
            />
          </div>
        </>
      )

    case 'clickhouse': {
      const isSecure = f.secure !== 'false'
      return (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="host">Host</Label>
              <PlainInput id="host" name="host" placeholder="" initialValue={f.host ?? null} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="port">Port</Label>
              <PlainInput
                id="port"
                name="port"
                placeholder="8443"
                type="number"
                initialValue={f.port ?? null}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="database">Database</Label>
            <PlainInput
              id="database"
              name="database"
              placeholder=""
              initialValue={f.database ?? null}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="user">User</Label>
              <PlainInput id="user" name="user" placeholder="" initialValue={f.user ?? null} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <MaskedInput
                id="password"
                name="password"
                placeholder="••••••••"
                initialValue={f.password ?? null}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              key={String(isSecure)}
              id="secure"
              name="secure"
              type="checkbox"
              defaultChecked={isSecure}
              className="h-4 w-4"
              onChange={onCheckboxChange}
            />
            <Label htmlFor="secure">Use TLS (secure)</Label>
          </div>
        </>
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Connection string (DuckDB / SQLite)
// ---------------------------------------------------------------------------

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
      <h3 className={TYPOGRAPHY.label}>Connection String</h3>
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
        <code className="flex-1 text-xs font-mono text-muted-foreground break-all">{value}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          title="Copy"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// buildCredentials — exported so CredentialsStep can reuse it
// ---------------------------------------------------------------------------

export function buildCredentials(dbType: DbType, form: HTMLFormElement): Record<string, unknown> {
  const data = new FormData(form)

  function get(key: string): string {
    const el = form.elements.namedItem(key) as HTMLInputElement | null
    if (el?.dataset.masked === 'true') return ''
    return (data.get(key) as string) || ''
  }

  switch (dbType) {
    case 'duckdb': {
      const path = get('file_path')
      return path.startsWith('s3://') ? { s3_path: path } : { file_path: path }
    }
    case 'sqlite':
      return { file_path: get('file_path') }
    case 'postgresql':
      return {
        host: get('host'),
        port: parseInt(get('port')) || 5432,
        database: get('database'),
        user: get('user'),
        password: get('password'),
      }
    case 'databricks':
      return {
        host: get('host'),
        http_path: get('http_path'),
        token: get('token'),
      }
    case 'snowflake': {
      const role = get('role')
      const creds: Record<string, unknown> = {
        account: get('account'),
        user: get('user'),
        password: get('password'),
        warehouse: get('warehouse'),
        database: get('database'),
        schema: get('schema'),
      }
      if (role) creds.role = role
      return creds
    }
    case 'clickhouse': {
      const secureEl = form.elements.namedItem('secure') as HTMLInputElement | null
      return {
        host: get('host'),
        port: parseInt(get('port')) || 8443,
        database: get('database'),
        user: get('user'),
        password: get('password'),
        secure: secureEl?.checked ?? true,
      }
    }
    default:
      return {}
  }
}

// ---------------------------------------------------------------------------
// Main tab
// ---------------------------------------------------------------------------

export function ConnectionConfigTab({ connection }: Props) {
  const [name, setName] = useState(connection.name)
  const update = useUpdateConnection(connection.id)
  const testMutation = useTestConnection()
  const { data: credsData } = useConnectionCredentials(connection.id)
  const formRef = useRef<HTMLFormElement>(null)
  const nameInitialized = useRef(false)
  const credsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fields = credsData?.fields ?? {}

  // Sync name when connection prop changes
  useEffect(() => {
    setName(connection.name)
    nameInitialized.current = true
  }, [connection.name])

  // Auto-save name on change (debounced)
  useEffect(() => {
    if (!nameInitialized.current) return
    const trimmed = name.trim()
    if (!trimmed || trimmed === connection.name) return
    const timer = setTimeout(() => {
      update.mutate({ name: trimmed })
    }, 700)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  function saveCredentials() {
    if (!formRef.current) return
    const credentials = buildCredentials(connection.db_type, formRef.current)
    // Strip empty-string values — masked fields return '' to signal "unchanged".
    // The backend merges partial credentials with existing stored ones.
    const changedCredentials = Object.fromEntries(
      Object.entries(credentials).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    )
    if (Object.keys(changedCredentials).length > 0) {
      update.mutate({ credentials: changedCredentials })
    }
  }

  function handleFormInput() {
    if (credsTimer.current) clearTimeout(credsTimer.current)
    testMutation.reset()
    credsTimer.current = setTimeout(saveCredentials, 1000)
  }

  function handleTest() {
    testMutation.mutate(connection.id)
  }

  const testResult = testMutation.data
  const testError = testMutation.error

  return (
    <form ref={formRef} onInput={handleFormInput} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className={TYPOGRAPHY.label}>Connection Name</h3>
          <SaveStatus
            status={
              update.isPending
                ? 'saving'
                : update.isSuccess
                  ? 'saved'
                  : update.isError
                    ? 'error'
                    : 'idle'
            }
            onRetry={() => update.mutate({ name: name.trim() })}
          />
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Production DB"
        />
      </div>

      {/* Connection string (DuckDB / SQLite only) */}
      {(connection.db_type === 'duckdb' || connection.db_type === 'sqlite') && (
        <ConnectionStringDisplay connId={connection.id} />
      )}

      {/* Credentials */}
      <div className="space-y-3">
        <div className="space-y-1">
          <h3 className={TYPOGRAPHY.label}>Credentials</h3>
          <p className="text-xs text-muted-foreground">
            Sensitive fields are masked. Leave them unchanged to keep existing values.
          </p>
        </div>
        <div className="rounded-md border p-4 space-y-3">
          <CredentialFields
            dbType={connection.db_type}
            fields={fields}
            onCheckboxChange={saveCredentials}
          />
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
        {testResult?.ok && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle className="h-4 w-4" />
            Connected ({testResult.db_type})
          </span>
        )}
        {(testError || testResult?.ok === false) && (
          <span className="flex items-center gap-1.5 text-sm text-destructive">
            <XCircle className="h-4 w-4" />
            {testError ? testError.message : 'Connection failed'}
          </span>
        )}
      </div>

      {update.error && <p className="text-sm text-destructive">{update.error.message}</p>}
    </form>
  )
}
