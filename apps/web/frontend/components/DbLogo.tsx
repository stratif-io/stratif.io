import { useState } from 'react'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import type { DbType } from '@/types'

import PostgreSQLIcon from '@/assets/db-logos/postgresql.svg?react'
import DuckDBIcon from '@/assets/db-logos/duckdb.svg?react'
import DatabricksIcon from '@/assets/db-logos/databricks.svg?react'
import SnowflakeIcon from '@/assets/db-logos/snowflake.svg?react'
import ClickHouseIcon from '@/assets/db-logos/clickhouse.svg?react'
import SQLiteIcon from '@/assets/db-logos/sqlite.svg?react'
import BigQueryIcon from '@/assets/db-logos/bigquery.svg?react'
import RedshiftIcon from '@/assets/db-logos/redshift.svg?react'
import MySQLIcon from '@/assets/db-logos/mysql.svg?react'

interface DbLogoProps {
  dbType: DbType | string
  className?: string
  size?: number
  style?: CSSProperties
}

const DB_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  postgresql: PostgreSQLIcon,
  duckdb: DuckDBIcon,
  databricks: DatabricksIcon,
  snowflake: SnowflakeIcon,
  clickhouse: ClickHouseIcon,
  sqlite: SQLiteIcon,
  bigquery: BigQueryIcon,
  redshift: RedshiftIcon,
  mysql: MySQLIcon,
}

export const DB_BRAND_COLORS: Record<string, string> = {
  postgresql: '#336791',
  duckdb: '#E6B800',
  databricks: '#FF3621',
  snowflake: '#29B5E8',
  clickhouse: '#D4A800',
  sqlite: '#003B57',
  bigquery: '#4285F4',
  redshift: '#8C4FFF',
  mysql: '#4479A1',
}

function GenericDbLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="16" cy="9" rx="11" ry="4" fill="currentColor" opacity=".5" />
      <path
        d="M5 9v5c0 2.2 4.9 4 11 4s11-1.8 11-4V9c0 2.2-4.9 4-11 4S5 11.2 5 9z"
        fill="currentColor"
        opacity=".35"
      />
      <path
        d="M5 14v5c0 2.2 4.9 4 11 4s11-1.8 11-4v-5c0 2.2-4.9 4-11 4S5 16.2 5 14z"
        fill="currentColor"
        opacity=".25"
      />
      <path
        d="M5 19v5c0 2.2 4.9 4 11 4s11-1.8 11-4v-5c0 2.2-4.9 4-11 4S5 21.2 5 19z"
        fill="currentColor"
        opacity=".15"
      />
    </svg>
  )
}

export function DbLogo({ dbType, className = '', size = 20, style }: DbLogoProps) {
  const [hovered, setHovered] = useState(false)

  const Icon = DB_ICONS[dbType]
  // Inline color style: brand color on hover wins over the Tailwind class color.
  // When not hovered, brandColor is undefined so the property is absent and the class applies.
  // Callers may pass their own style; color is overridden by hover but falls back to style.color.
  const brandColor = hovered ? DB_BRAND_COLORS[dbType] : undefined

  if (!Icon) {
    return (
      <span className={cn('text-muted-foreground', className)} style={style}>
        <GenericDbLogo size={size} />
      </span>
    )
  }

  return (
    <span
      className={cn('text-muted-foreground', className)}
      style={{ ...style, color: brandColor ?? style?.color }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Icon width={size} height={size} />
    </span>
  )
}
