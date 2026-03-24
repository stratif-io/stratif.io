# Database Logos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hand-crafted inline SVG database logos with brand-accurate icons from `simple-icons`, each in its own file, with neutral default color and brand color on hover.

**Architecture:** Install `vite-plugin-svgr` to enable `?react` SVG imports; extract SVG paths from `simple-icons` into individual asset files with `fill="currentColor"`; rewrite `DbLogo.tsx` to import each as a React component and apply brand color on hover via inline style; update the design system page to show both states.

**Tech Stack:** React 18, Vite 6, `vite-plugin-svgr`, `simple-icons`, TypeScript, Tailwind CSS v4

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `apps/web/vite.config.ts` | Register `vite-plugin-svgr` plugin |
| Modify | `apps/web/frontend/vite-env.d.ts` | Add `vite-plugin-svgr/client` type reference |
| Create | `apps/web/frontend/assets/db-logos/postgresql.svg` | PostgreSQL icon (`fill="currentColor"`) |
| Create | `apps/web/frontend/assets/db-logos/duckdb.svg` | DuckDB icon (hand-crafted, `fill="currentColor"`) |
| Create | `apps/web/frontend/assets/db-logos/databricks.svg` | Databricks icon |
| Create | `apps/web/frontend/assets/db-logos/snowflake.svg` | Snowflake icon |
| Create | `apps/web/frontend/assets/db-logos/clickhouse.svg` | ClickHouse icon |
| Create | `apps/web/frontend/assets/db-logos/sqlite.svg` | SQLite icon |
| Create | `apps/web/frontend/assets/db-logos/bigquery.svg` | BigQuery icon |
| Create | `apps/web/frontend/assets/db-logos/redshift.svg` | Redshift icon |
| Create | `apps/web/frontend/assets/db-logos/mysql.svg` | MySQL icon |
| Rewrite | `apps/web/frontend/components/DbLogo.tsx` | Hover-aware component importing SVGs as React components |
| Modify | `apps/web/frontend/features/design-system/components/sections/AppComponentsSection.tsx` | Add brand-color demonstration row |

---

## Task 1: Install dependencies and configure Vite

**Files:**
- Modify: `apps/web/package.json` (via npm install)
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/frontend/vite-env.d.ts`

- [ ] **Step 1: Install packages**

```bash
cd apps/web
npm install -D vite-plugin-svgr simple-icons
```

Expected: both packages appear in `devDependencies` in `package.json`.

- [ ] **Step 2: Register svgr plugin in vite.config.ts**

Add `import svgr from 'vite-plugin-svgr'` at the top of the file, then add `svgr()` to the `plugins` array after `react()`:

```ts
import svgr from 'vite-plugin-svgr'

// inside the plugins array (after react()):
plugins: [
  react(),
  svgr(),
  tailwindcss(),
  // ...existing redirect-root plugin unchanged
],
```

- [ ] **Step 3: Add type reference to vite-env.d.ts**

Append after the existing `/// <reference types="vite/client" />` line:

```ts
/// <reference types="vite-plugin-svgr/client" />
```

- [ ] **Step 4: Verify Vite dev server starts without errors**

```bash
cd apps/web
npm run dev
```

Expected: server starts on port 5173 with no plugin errors. Stop with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/vite.config.ts apps/web/frontend/vite-env.d.ts
git commit -m "build: add vite-plugin-svgr and simple-icons"
```

---

## Task 2: Create SVG asset files

**Files:**
- Create: `apps/web/frontend/assets/db-logos/*.svg` (9 files)

Each file is a minimal SVG — no `width`/`height`, `fill="currentColor"`, `viewBox="0 0 24 24"` — wrapping the path data from `simple-icons`.

- [ ] **Step 1: Create the assets directory and extract SVG files via script**

Run this script from the repo root. It reads path data from `simple-icons` and writes each `.svg` file directly:

```bash
node -e "
const path = require('path');
const fs = require('fs');
const si = require('simple-icons');

const OUT = 'apps/web/frontend/assets/db-logos';
fs.mkdirSync(OUT, { recursive: true });

const icons = [
  ['postgresql', si.siPostgresql],
  ['databricks', si.siDatabricks],
  ['snowflake',  si.siSnowflake],
  ['clickhouse', si.siClickhouse],
  ['sqlite',     si.siSqlite],
  ['bigquery',   si.siGooglebigquery],
  ['redshift',   si.siAmazonredshift],
  ['mysql',      si.siMysql],
];

for (const [name, icon] of icons) {
  const content = \`<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"currentColor\">
  \${icon.svg}
</svg>\`;
  fs.writeFileSync(path.join(OUT, name + '.svg'), content);
  console.log('wrote', name + '.svg');
}
"
```

Expected output: 8 lines — `wrote postgresql.svg`, `wrote databricks.svg`, etc.

- [ ] **Step 2: Create duckdb.svg (hand-crafted)**

DuckDB is not in `simple-icons`. Create the file manually:

```bash
cat > apps/web/frontend/assets/db-logos/duckdb.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <!-- DuckDB: not available in simple-icons — hand-crafted brand-approximate icon.
       currentColor = the yellow half (brand color applied by DbLogo).
       The dark half uses a hardcoded fill (#1C1C1C) with no theming hook. -->
  <circle cx="12" cy="12" r="10"/>
  <path fill="#1C1C1C" d="M12 2a10 10 0 0 1 0 20V2z"/>
  <circle cx="15" cy="9.5" r="2" fill="#1C1C1C"/>
  <circle cx="15.8" cy="8.8" r=".8" fill="currentColor"/>
</svg>
EOF
```

- [ ] **Step 3: Verify all 9 files exist**

```bash
ls apps/web/frontend/assets/db-logos/
```

Expected: `bigquery.svg  clickhouse.svg  databricks.svg  duckdb.svg  mysql.svg  postgresql.svg  redshift.svg  snowflake.svg  sqlite.svg`

- [ ] **Step 4: Commit**

```bash
git add apps/web/frontend/assets/db-logos/
git commit -m "feat: add db-logos SVG assets from simple-icons"
```

---

## Task 3: Rewrite DbLogo.tsx

**Files:**
- Rewrite: `apps/web/frontend/components/DbLogo.tsx`

- [ ] **Step 1: Replace the entire file with the new implementation**

```tsx
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import type { DbType } from '@/types'

import PostgreSQLIcon from '@/assets/db-logos/postgresql.svg?react'
import DuckDBIcon     from '@/assets/db-logos/duckdb.svg?react'
import DatabricksIcon from '@/assets/db-logos/databricks.svg?react'
import SnowflakeIcon  from '@/assets/db-logos/snowflake.svg?react'
import ClickHouseIcon from '@/assets/db-logos/clickhouse.svg?react'
import SQLiteIcon     from '@/assets/db-logos/sqlite.svg?react'
import BigQueryIcon   from '@/assets/db-logos/bigquery.svg?react'
import RedshiftIcon   from '@/assets/db-logos/redshift.svg?react'
import MySQLIcon      from '@/assets/db-logos/mysql.svg?react'

interface DbLogoProps {
  dbType: DbType | string
  className?: string
  size?: number
  style?: CSSProperties
}

const DB_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  postgresql: PostgreSQLIcon,
  duckdb:     DuckDBIcon,
  databricks: DatabricksIcon,
  snowflake:  SnowflakeIcon,
  clickhouse: ClickHouseIcon,
  sqlite:     SQLiteIcon,
  bigquery:   BigQueryIcon,
  redshift:   RedshiftIcon,
  mysql:      MySQLIcon,
}

export const DB_BRAND_COLORS: Record<string, string> = {
  postgresql: '#336791',
  duckdb:     '#E6B800',
  databricks: '#FF3621',
  snowflake:  '#29B5E8',
  clickhouse: '#D4A800',
  sqlite:     '#003B57',
  bigquery:   '#4285F4',
  redshift:   '#8C4FFF',
  mysql:      '#4479A1',
}

function GenericDbLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="16" cy="9" rx="11" ry="4" fill="currentColor" opacity=".5"/>
      <path d="M5 9v5c0 2.2 4.9 4 11 4s11-1.8 11-4V9c0 2.2-4.9 4-11 4S5 11.2 5 9z" fill="currentColor" opacity=".35"/>
      <path d="M5 14v5c0 2.2 4.9 4 11 4s11-1.8 11-4v-5c0 2.2-4.9 4-11 4S5 16.2 5 14z" fill="currentColor" opacity=".25"/>
      <path d="M5 19v5c0 2.2 4.9 4 11 4s11-1.8 11-4v-5c0 2.2-4.9 4-11 4S5 21.2 5 19z" fill="currentColor" opacity=".15"/>
    </svg>
  )
}

export function DbLogo({ dbType, className = '', size = 20, style }: DbLogoProps) {
  const [hovered, setHovered] = useState(false)

  const Icon = DB_ICONS[dbType]
  // Inline color style: brand color on hover wins over the Tailwind class color.
  // When not hovered, brandColor is undefined so the property is absent and the class applies.
  // Callers may pass their own style; it is merged but color is overridden by hover.
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web
npm run build
```

Expected: build completes with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/components/DbLogo.tsx
git commit -m "feat: rewrite DbLogo with simple-icons SVGs and hover brand color"
```

---

## Task 4: Update the design system page

**Files:**
- Modify: `apps/web/frontend/features/design-system/components/sections/AppComponentsSection.tsx`

- [ ] **Step 1: Update the DbLogo import to include DB_BRAND_COLORS**

Find the existing import of `DbLogo` and update it:

```ts
import { DbLogo, DB_BRAND_COLORS } from '@/components/DbLogo'
```

- [ ] **Step 2: Add brand-color demonstration row after the existing DbLogo row**

The existing row ends at the `</ComponentRow>` closing tag around line 180. Insert immediately after it:

```tsx
<ComponentRow label="DbLogo (brand colors)">
  <div className="flex items-center gap-4">
    {(['duckdb','postgresql','bigquery','snowflake','databricks','clickhouse','redshift','mysql','sqlite'] as const).map((db) => (
      <DbLogo
        key={db}
        dbType={db}
        size={28}
        style={{ color: DB_BRAND_COLORS[db] }}
      />
    ))}
  </div>
</ComponentRow>
```

- [ ] **Step 3: Verify the design system page renders correctly**

```bash
cd apps/web
npm run dev
```

Open `http://localhost:5173/design-system` and confirm:
- Row "DbLogo" shows all 9 logos in muted/neutral color; hovering reveals brand color
- Row "DbLogo (brand colors)" shows all 9 logos in their brand colors statically

Stop with Ctrl+C.

- [ ] **Step 4: Run unit tests**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/features/design-system/components/sections/AppComponentsSection.tsx
git commit -m "feat: update design system to show db logo brand colors"
```

---

## Task 5: Final verification

- [ ] **Step 1: Full build and lint**

```bash
cd apps/web
npm run build && npm run lint
```

Expected: build passes, zero lint warnings.

- [ ] **Step 2: E2E smoke**

```bash
npm run test:e2e -- --grep "connection"
```

Expected: connection-related E2E tests pass (DbLogo renders in the connections list and connection detail page).
