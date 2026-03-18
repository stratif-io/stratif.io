# Snowflake & ClickHouse Connection Forms Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Snowflake and ClickHouse as selectable database types in the frontend connection UI (create + edit flows).

**Architecture:** Purely additive frontend change — extend the `DbType` union, add field blocks to `ConnectionFormDialog` (create) and `ConnectionConfigTab` (edit), and extend `buildCredentials()` for both new types. No backend changes required.

**Tech Stack:** React 18, TypeScript, shadcn/ui (`Input`, `Label`), existing `MaskedInput` and `PlainInput` components.

---

### Task 1: Extend `DbType`

**Files:**
- Modify: `frontend/types/index.ts:238`

- [ ] **Step 1: Extend the union**

Change line 238:
```typescript
// Before
export type DbType = 'duckdb' | 'databricks' | 'postgresql' | 'sqlite'

// After
export type DbType = 'duckdb' | 'databricks' | 'postgresql' | 'sqlite' | 'snowflake' | 'clickhouse'
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No type errors. The switch statements in both components will show exhaustiveness warnings — that's fine, they'll be resolved in Tasks 2 & 3.

- [ ] **Step 3: Commit**

```bash
git add frontend/types/index.ts
git commit -m "feat: add snowflake and clickhouse to DbType union"
```

---

### Task 2: `ConnectionFormDialog.tsx` — create flow

**Files:**
- Modify: `frontend/features/connections/components/ConnectionFormDialog.tsx`

- [ ] **Step 1: Add Snowflake and ClickHouse to the `DB_TYPES` array**

In the `DB_TYPES` constant (line 22), add after the `sqlite` entry:
```typescript
{ value: 'snowflake', label: 'Snowflake' },
{ value: 'clickhouse', label: 'ClickHouse' },
```

- [ ] **Step 2: Add Snowflake field block to `CredentialFields`**

In the `CredentialFields` switch, add a `case 'snowflake':` block before the closing brace of the switch (after `case 'databricks'`):
```tsx
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
          <Input id="password" name="password" type="password" placeholder="••••••••" required />
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
        <Label htmlFor="role">Role <span className="text-muted-foreground">(optional)</span></Label>
        <Input id="role" name="role" placeholder="ACCOUNTADMIN" />
      </div>
    </div>
  )
```

- [ ] **Step 3: Add ClickHouse field block to `CredentialFields`**

Add `case 'clickhouse':` after `case 'snowflake':`:
```tsx
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
          <Input id="port" name="port" placeholder="8443" type="number" min={1} max={65535} required />
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
          <Input id="password" name="password" type="password" placeholder="••••••••" required />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input id="secure" name="secure" type="checkbox" defaultChecked className="h-4 w-4" />
        <Label htmlFor="secure">Use TLS (secure)</Label>
      </div>
    </div>
  )
```

- [ ] **Step 4: Extend `buildCredentials()` for Snowflake**

In the `buildCredentials` function switch, add `case 'snowflake':` after `case 'databricks':`:
```typescript
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
```

- [ ] **Step 5: Extend `buildCredentials()` for ClickHouse**

Add `case 'clickhouse':` after `case 'snowflake':`:
```typescript
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
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/features/connections/components/ConnectionFormDialog.tsx
git commit -m "feat: add Snowflake and ClickHouse to connection create form"
```

---

### Task 3: `ConnectionConfigTab.tsx` — edit flow

**Files:**
- Modify: `frontend/features/connections/components/ConnectionConfigTab.tsx`

- [ ] **Step 1: Add Snowflake field block to `CredentialFields`**

In the `CredentialFields` switch, add `case 'snowflake':` after `case 'databricks':`:
```tsx
case 'snowflake':
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="account">Account</Label>
        <PlainInput id="account" name="account" placeholder="xy12345.us-east-1" initialValue={f.account ?? null} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="user">User</Label>
          <PlainInput id="user" name="user" placeholder="" initialValue={f.user ?? null} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <MaskedInput id="password" name="password" placeholder="••••••••" initialValue={f.password ?? null} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="warehouse">Warehouse</Label>
        <PlainInput id="warehouse" name="warehouse" placeholder="COMPUTE_WH" initialValue={f.warehouse ?? null} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="database">Database</Label>
          <PlainInput id="database" name="database" placeholder="" initialValue={f.database ?? null} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="schema">Schema</Label>
          <PlainInput id="schema" name="schema" placeholder="" initialValue={f.schema ?? null} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="role">Role <span className="text-muted-foreground">(optional)</span></Label>
        <PlainInput id="role" name="role" placeholder="ACCOUNTADMIN" initialValue={f.role ?? null} />
      </div>
    </>
  )
```

- [ ] **Step 2: Add `onCheckboxChange` prop to `CredentialFieldsProps` and function signature**

The `secure` checkbox fires `onChange` (not `onInput`), so the edit-form's debounced save won't catch it via the form's `onInput` bubble. We pass `saveCredentials` directly.

Update the interface (line ~121):
```typescript
interface CredentialFieldsProps {
  dbType: DbType
  fields: Record<string, string | null>
  onCheckboxChange?: () => void
}
```

Update the function signature (line ~126):
```typescript
function CredentialFields({ dbType, fields, onCheckboxChange }: CredentialFieldsProps)
```

- [ ] **Step 3: Add ClickHouse field block to `CredentialFields`**

Add `case 'clickhouse':` after `case 'snowflake':` in the switch:
```tsx
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
          <PlainInput id="port" name="port" placeholder="8443" type="number" initialValue={f.port ?? null} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="database">Database</Label>
        <PlainInput id="database" name="database" placeholder="" initialValue={f.database ?? null} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="user">User</Label>
          <PlainInput id="user" name="user" placeholder="" initialValue={f.user ?? null} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <MaskedInput id="password" name="password" placeholder="••••••••" initialValue={f.password ?? null} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
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
```

- [ ] **Step 4: Pass `saveCredentials` as `onCheckboxChange` at the call site**

Find the `<CredentialFields>` usage in the JSX (around line 386) and update it:
```tsx
<CredentialFields dbType={connection.db_type} fields={fields} onCheckboxChange={saveCredentials} />
```

- [ ] **Step 5: Extend `buildCredentials()` for Snowflake in edit flow**

In the `buildCredentials` function, add `case 'snowflake':` after `case 'databricks':`:
```typescript
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
```

- [ ] **Step 6: Extend `buildCredentials()` for ClickHouse in edit flow**

Add `case 'clickhouse':` after `case 'snowflake':`:
```typescript
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
```

- [ ] **Step 7: Verify build and lint**

Run: `npm run build && npm run lint`
Expected: No errors, no warnings.

- [ ] **Step 8: Commit**

```bash
git add frontend/features/connections/components/ConnectionConfigTab.tsx
git commit -m "feat: add Snowflake and ClickHouse to connection edit form"
```
