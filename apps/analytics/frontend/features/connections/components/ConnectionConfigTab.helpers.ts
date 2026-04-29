import type { DbType } from '@/types'

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
