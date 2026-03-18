import type { DbType } from '@/types'

interface DbLogoProps {
  dbType: DbType | string
  className?: string
  size?: number
}

function PostgreSQLLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M23.2 2.4c-1.4-.4-2.9-.4-4.3 0-1-.7-3.2-1.8-5.8-1.3C9 2 6.4 5.6 6 9.6c-.4 3.5.6 6.6 2.6 8.3.4.4.9.6 1.4.7v3.8c0 1.4.6 2.7 1.7 3.6l2.2 1.9c.5.4 1 .6 1.6.6.5 0 1-.2 1.4-.5l.2-.2.2.2c.4.3.9.5 1.4.5.6 0 1.1-.2 1.6-.6l2.2-1.9c1.1-.9 1.7-2.2 1.7-3.6v-1c.5 0 1-.1 1.5-.3 2.2-.8 3.6-3.4 3.6-6.8-.1-5.6-2.9-9.5-6.1-11.9z" fill="#336791"/>
      <path d="M22.1 4.2c-.7-.5-1.5-.8-2.3-1C17.4 2.6 15 3.4 13.4 5c-1.7-1.5-4.1-2-6.1-1.2C5 4.8 3.4 7.8 3.6 11c.2 2.8 1.4 5 3.1 6.2.3.2.7.4 1 .5v4.1c0 1.1.5 2.2 1.4 2.9l2.2 1.9c.3.2.6.4.9.4.3 0 .6-.1.8-.3l1.1-1 1.1 1c.2.2.5.3.8.3.3 0 .6-.1.9-.4l2.2-1.9c.9-.8 1.4-1.8 1.4-2.9v-1.6c.5.1 1 .1 1.5-.1 1.8-.6 3-2.8 3-5.7 0-4.7-2.4-8.2-5.3-10.2z" fill="#336791"/>
      <path d="M20.8 5.6c2.4 1.7 4.3 4.8 4.3 8.8 0 2.4-.9 4.1-2.2 4.6-.5.2-1 .2-1.6.1v-3.7c0-2.5-.4-4.3-1.2-5.4.8-.8 1.3-2.1 1.3-3.5 0-.4 0-.6-.1-.9h-.5zM11.5 19.8v2.6c0 .9.4 1.7 1.1 2.3l2.2 1.9c.1.1.3.1.4 0l2.2-1.9c.7-.6 1.1-1.4 1.1-2.3v-.5c-.9.3-1.9.4-2.9.4-1.4 0-2.8-.2-4.1-.5z" fill="#fff" opacity=".3"/>
      <path d="M16.5 8.5c.2 1.4.1 2.9-.3 4.1.4.8.6 1.9.6 3.3v3.9c1.1-.1 2-.7 2.5-1.8.3-.6.5-1.4.5-2.2 0-3.5-1.5-6.2-3.3-7.3zM9.9 10.5c-.5 1.1-.7 2.5-.5 4.1.2 1.3.7 2.4 1.4 3.1.5.5 1 .8 1.6 1v-2.3c0-1.4.2-2.5.6-3.3-.6-1.3-.9-2.8-.9-4.1-.8.3-1.6.8-2.2 1.5z" fill="#fff" opacity=".2"/>
      <ellipse cx="14.2" cy="9.4" rx="1" ry="1.3" fill="#fff"/>
      <ellipse cx="19.2" cy="9.1" rx=".8" ry="1.1" fill="#fff"/>
      <path d="M13 12.5c.3.5.8.8 1.4.8s1.1-.3 1.4-.8H13zm3.5 0c.3.5.8.8 1.4.8s1.1-.3 1.4-.8h-2.8z" fill="#fff" opacity=".6"/>
    </svg>
  )
}

function DuckDBLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#FFF000"/>
      <circle cx="16" cy="16" r="14" fill="url(#duckdb-grad)"/>
      <defs>
        <radialGradient id="duckdb-grad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFEE00"/>
          <stop offset="100%" stopColor="#E6C800"/>
        </radialGradient>
      </defs>
      <path d="M8 16c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8" fill="#1C1C1C"/>
      <circle cx="20" cy="13" r="2.5" fill="#1C1C1C"/>
      <circle cx="21" cy="12.2" r="1" fill="#fff"/>
    </svg>
  )
}

function DatabricksLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 3L3 10.5v4.2l13 7.5 13-7.5v-4.2L16 3z" fill="#FF3621"/>
      <path d="M3 15.8v4.2l13 7.5V23l-13-7.2z" fill="#FF3621" opacity=".8"/>
      <path d="M29 15.8v4.2l-13 7.5V23l13-7.2z" fill="#FF3621" opacity=".8"/>
      <path d="M16 23v4.5L3 20v-4.2L16 23z" fill="#FF3621" opacity=".6"/>
      <path d="M16 23v4.5l13-7.5V20L16 23z" fill="#FF3621" opacity=".6"/>
      <path d="M3 10.5l13-7.5 13 7.5-13 7.5L3 10.5z" fill="#FF8C69"/>
    </svg>
  )
}

function SnowflakeLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="6" fill="#29B5E8"/>
      <path d="M16 4v24M16 4l-3 3m3-3l3 3M16 28l-3-3m3 3l3-3" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 16h24M4 16l3-3M4 16l3 3M28 16l-3-3m3 3l-3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      <path d="M7.5 7.5l17 17M7.5 7.5l1 4m-1-4l4 1M24.5 24.5l-1-4m1 4l-4-1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M24.5 7.5l-17 17M24.5 7.5l-4 1m4-1l-1 4M7.5 24.5l4-1m-4 1l1-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="16" cy="16" r="2.5" fill="#fff"/>
    </svg>
  )
}

function ClickHouseLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="5" width="4" height="22" rx="1" fill="#FACC15"/>
      <rect x="10" y="5" width="4" height="22" rx="1" fill="#FACC15"/>
      <rect x="17" y="5" width="4" height="22" rx="1" fill="#FACC15"/>
      <rect x="24" y="5" width="4" height="22" rx="1" fill="#FACC15" opacity=".4"/>
      <rect x="3" y="13" width="4" height="6" rx="1" fill="#E53E3E"/>
    </svg>
  )
}

function SQLiteLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M26 6.5C26 4 21.5 2 16 2S6 4 6 6.5v19C6 28 10.5 30 16 30s10-2 10-4.5v-19z" fill="#003B57"/>
      <ellipse cx="16" cy="6.5" rx="10" ry="3" fill="#0F80CC"/>
      <path d="M6 6.5v5c0 1.7 4.5 3 10 3s10-1.3 10-3v-5c0 1.7-4.5 3-10 3S6 8.2 6 6.5z" fill="#0F80CC" opacity=".5"/>
      <text x="16" y="22" textAnchor="middle" fill="#0F80CC" fontSize="8" fontFamily="monospace" fontWeight="bold">SQL</text>
    </svg>
  )
}

function BigQueryLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="6" fill="#4285F4"/>
      <path d="M20.5 20.5l4 4-1.5 1.5-4-4v-1l-.4-.4A7 7 0 1 1 20 19.6l.4.4h1zm-7-1a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" fill="#fff"/>
      <circle cx="13.5" cy="14.5" r="3.5" fill="#4285F4"/>
    </svg>
  )
}

function RedshiftLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2L4 8v16l12 6 12-6V8L16 2z" fill="#8C4FFF"/>
      <path d="M16 2L4 8l12 6 12-6L16 2z" fill="#BF80FF"/>
      <path d="M16 14L4 8v16l12-10z" fill="#6B2FCC"/>
      <path d="M16 14l12-6v16L16 14z" fill="#9B4FFF"/>
      <circle cx="16" cy="16" r="3" fill="#fff" opacity=".9"/>
    </svg>
  )
}

function MySQLLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 20.5c1.2 0 2-.3 2.6-.8V17H3v-1h3v5c-.8.7-1.9 1-3 1C1 22 0 21 0 19s1-3 3-3c.8 0 1.5.2 2 .6l-.6.8c-.4-.3-.9-.4-1.4-.4C2 17 1 17.8 1 19s.4 1.5 1 1.5z" fill="#00618A"/>
      <text x="1" y="14" fill="#00618A" fontSize="7" fontFamily="sans-serif" fontWeight="bold">MySQL</text>
      <path d="M16 8c-3 0-5.5 1.5-7 3.8 1-.5 2.2-.8 3.5-.8 4.1 0 7.5 3.4 7.5 7.5S16.6 26 12.5 26c-1.3 0-2.5-.3-3.5-.8C10.5 27.5 13 29 16 29c5 0 9-4 9-9s-4-12-9-12z" fill="#E48E00"/>
    </svg>
  )
}

function GenericDbLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="16" cy="9" rx="11" ry="4" fill="#6B7280"/>
      <path d="M5 9v5c0 2.2 4.9 4 11 4s11-1.8 11-4V9c0 2.2-4.9 4-11 4S5 11.2 5 9z" fill="#4B5563"/>
      <path d="M5 14v5c0 2.2 4.9 4 11 4s11-1.8 11-4v-5c0 2.2-4.9 4-11 4S5 16.2 5 14z" fill="#374151"/>
      <path d="M5 19v5c0 2.2 4.9 4 11 4s11-1.8 11-4v-5c0 2.2-4.9 4-11 4S5 21.2 5 19z" fill="#1F2937"/>
    </svg>
  )
}

export function DbLogo({ dbType, className = '', size = 20 }: DbLogoProps) {
  const props = { size }
  switch (dbType) {
    case 'postgresql': return <span className={className}><PostgreSQLLogo {...props} /></span>
    case 'duckdb':     return <span className={className}><DuckDBLogo {...props} /></span>
    case 'databricks': return <span className={className}><DatabricksLogo {...props} /></span>
    case 'snowflake':  return <span className={className}><SnowflakeLogo {...props} /></span>
    case 'clickhouse': return <span className={className}><ClickHouseLogo {...props} /></span>
    case 'sqlite':     return <span className={className}><SQLiteLogo {...props} /></span>
    case 'bigquery':   return <span className={className}><BigQueryLogo {...props} /></span>
    case 'redshift':   return <span className={className}><RedshiftLogo {...props} /></span>
    case 'mysql':      return <span className={className}><MySQLLogo {...props} /></span>
    default:           return <span className={className}><GenericDbLogo {...props} /></span>
  }
}
