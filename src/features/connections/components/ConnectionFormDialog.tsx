import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateConnection, useUpdateConnection } from '../hooks/useConnectionsData'
import type { Connection, DbType } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection?: Connection
}

const DB_TYPES: { value: DbType; label: string }[] = [
  { value: 'duckdb', label: 'DuckDB' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'databricks', label: 'Databricks' },
  { value: 'sqlite', label: 'SQLite' },
]

function CredentialFields({ dbType }: { dbType: DbType }) {
  switch (dbType) {
    case 'duckdb':
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="file_path">File Path / S3 Path</Label>
            <Input id="file_path" name="file_path" placeholder="/path/to/db.duckdb or s3://..." />
          </div>
        </div>
      )
    case 'sqlite':
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="file_path">File Path</Label>
            <Input id="file_path" name="file_path" placeholder="/path/to/db.sqlite" />
          </div>
        </div>
      )
    case 'postgresql':
      return (
        <div className="space-y-3">
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
        </div>
      )
    case 'databricks':
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="host">Workspace Host</Label>
            <Input id="host" name="host" placeholder="adb-xxxx.azuredatabricks.net" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="http_path">HTTP Path</Label>
            <Input id="http_path" name="http_path" placeholder="/sql/1.0/warehouses/..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="token">Access Token</Label>
            <Input id="token" name="token" type="password" placeholder="dapiXXXXXXXX" />
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
  }
}

export function ConnectionFormDialog({ open, onOpenChange, connection }: Props) {
  const [name, setName] = useState('')
  const [dbType, setDbType] = useState<DbType>('duckdb')

  const create = useCreateConnection()
  const update = useUpdateConnection(connection?.id ?? '')

  const isEdit = !!connection
  const isPending = create.isPending || update.isPending

  useEffect(() => {
    if (connection) {
      setName(connection.name)
      setDbType(connection.db_type)
    } else {
      setName('')
      setDbType('duckdb')
    }
  }, [connection, open])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const credentials = isEdit ? undefined : buildCredentials(dbType, form)

    if (isEdit) {
      update.mutate({ name }, { onSuccess: () => onOpenChange(false) })
    } else {
      create.mutate(
        { name, db_type: dbType, credentials: credentials! },
        { onSuccess: () => onOpenChange(false) }
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Connection' : 'New Connection'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Connection Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Production DB"
              required
            />
          </div>

          {!isEdit && (
            <>
              <div className="space-y-1.5">
                <Label>Database Type</Label>
                <Select value={dbType} onValueChange={(v) => setDbType(v as DbType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DB_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Credentials
                </p>
                <CredentialFields dbType={dbType} />
              </div>
            </>
          )}

          {(create.isError || update.isError) && (
            <p className="text-sm text-destructive">
              {(create.error || update.error)?.message}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
