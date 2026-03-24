# Database Logos — Design Spec

**Date:** 2026-03-24
**Status:** Approved

## Overview

Replace the hand-crafted inline SVG logos in `DbLogo.tsx` with high-quality, brand-accurate icons sourced from the `simple-icons` npm package. Each database gets its own `.svg` file. Logos render neutral by default and reveal their official brand color on hover or when active.

## Problem

Current logos in `apps/web/frontend/components/DbLogo.tsx` are hand-drawn approximations with inconsistent quality. They are all inlined in a single file, making them hard to maintain or reuse independently.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Icon source | `simple-icons` npm package | Brand-approved shapes, official hex colors, consistent style across all 9 DBs |
| Coloring | Neutral default, brand color on hover/active | Clean UI at rest; brand identity revealed on interaction |
| File format | Individual `.svg` files with `fill="currentColor"` | One file per database; color controlled via CSS `currentColor` |
| SVG import mechanism | `vite-plugin-svgr` (`?react` suffix) | Imports SVGs as React components, enabling inline `color` style control |

## Prerequisites / New Dependencies

Two new dependencies are required:

```bash
# In apps/web/
npm install -D simple-icons        # used only to extract SVG paths (can remove after extraction)
npm install -D vite-plugin-svgr    # required for ?react SVG imports in Vite
```

`vite.config.ts` must register the plugin:
```ts
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [
    react(),
    svgr(),   // <-- add this
    // ...existing plugins
  ],
})
```

`vite-env.d.ts` must include the type reference to avoid TypeScript errors on `?react` imports:
```ts
/// <reference types="vite-plugin-svgr/client" />
```

## Extracting SVG Paths from simple-icons

`simple-icons` ships JS objects, not individual `.svg` files. Each icon exposes:
- `icon.svg` — the inner SVG markup (a `<path d="..."/>` string, ready to embed)
- `icon.hex` — the brand color hex (without `#`)

Extract paths using a one-off script or inline at author time:
```ts
import { siPostgresql } from 'simple-icons'
// siPostgresql.svg  → '<path d="..."/>'
// siPostgresql.hex  → '336791'
```

Exact simple-icons icon names for the 9 databases:

| Database | simple-icons export | Notes |
|---|---|---|
| PostgreSQL | `siPostgresql` | ✓ |
| DuckDB | — | **Not in simple-icons** — craft manually (see below) |
| Databricks | `siDatabricks` | ✓ |
| Snowflake | `siSnowflake` | ✓ |
| ClickHouse | `siClickhouse` | ✓ (added in v9+; pin to latest) |
| SQLite | `siSqlite` | ✓ |
| BigQuery | `siGooglebigquery` | Note: prefixed with "Google" |
| Redshift | `siAmazonredshift` | Note: prefixed with "Amazon" |
| MySQL | `siMysql` | ✓ |

## File Structure

```
apps/web/frontend/assets/db-logos/
  postgresql.svg
  duckdb.svg          ← hand-crafted (not in simple-icons)
  databricks.svg
  snowflake.svg
  clickhouse.svg
  sqlite.svg
  bigquery.svg
  redshift.svg
  mysql.svg
```

Each file is a minimal SVG with `fill="currentColor"` and no `width`/`height` (size set by consumer):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="..."/>
</svg>
```

**DuckDB:** No simple-icons entry exists. Hand-craft a clean minimal SVG matching the DuckDB brand (yellow circle, black half-circle, eye motif) using `fill="currentColor"` for the primary shape. Document the deviation in a comment in the file.

## Brand Colors

| Database | Hex | Light-mode note |
|---|---|---|
| PostgreSQL | `#336791` | ✓ readable |
| DuckDB | `#E6B800` | Use darkened yellow (not `#FFF000`) — pure yellow is invisible on white |
| Databricks | `#FF3621` | ✓ readable |
| Snowflake | `#29B5E8` | ✓ readable |
| ClickHouse | `#D4A800` | Use darkened yellow — `#FACC15` is hard to read on white |
| SQLite | `#003B57` | ✓ readable |
| BigQuery | `#4285F4` | ✓ readable |
| Redshift | `#8C4FFF` | ✓ readable |
| MySQL | `#4479A1` | ✓ readable |

DuckDB and ClickHouse use darkened brand-adjacent yellows to maintain readability on both light and dark backgrounds, in lieu of their official hex values which are invisible on white.

## `DbLogo` Component

`apps/web/frontend/components/DbLogo.tsx` updated to:

1. Import each SVG as a React component via `?react`:
   ```ts
   import PostgreSQLIcon from '@/assets/db-logos/postgresql.svg?react'
   ```
2. Define a `DB_BRAND_COLORS` lookup map:
   ```ts
   const DB_BRAND_COLORS: Record<string, string> = {
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
   ```
3. Track hover state with `useState<boolean>`:
   ```tsx
   const [hovered, setHovered] = useState(false)
   const brandColor = hovered ? DB_BRAND_COLORS[dbType] : undefined
   // Apply as inline style: style={{ color: brandColor }}
   // Default class: 'text-muted-foreground' (Tailwind)
   // Inline style overrides the class when present; absent when not hovered.
   ```
4. Wrap the icon in a `<span>` with `onMouseEnter`/`onMouseLeave` and pass both `className` (for default color) and `style={{ color: brandColor }}`:
   ```tsx
   <span
     className={cn('text-muted-foreground', className)}
     style={{ color: brandColor }}
     onMouseEnter={() => setHovered(true)}
     onMouseLeave={() => setHovered(false)}
   >
     <Icon width={size} height={size} />
   </span>
   ```

The inline `color` style takes precedence over the Tailwind class when set, and is `undefined` (absent) when not hovered — so the class re-applies correctly. No CSS specificity conflict.

Props remain unchanged: `dbType`, `className`, `size`.

The `GenericDbLogo` fallback stays as an inline SVG with no hover effect (no brand color).

## Design System Update

`AppComponentsSection.tsx` is updated to show a "Database Logos" section with two rows:

1. **Neutral state:** all logos in default `text-muted-foreground`
2. **Brand color state:** all logos with their brand color applied via a forced `style` prop (simulating hover statically, since hover is interactive and cannot be shown in a static design system snapshot)

Use a wrapper that directly applies the brand color inline to the icon span to demonstrate the "active" state without relying on mouse interaction.

## Out of Scope

- Animated color transitions on hover
- Dark-mode–specific color variants
- Replacing app favicon/logo assets
- Removing `simple-icons` after extraction (acceptable to keep as devDependency)
