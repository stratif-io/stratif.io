import { useMemo, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { ScanSearch, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SaveStatus } from '@/components/ui/save-status'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSchemaForm, type UserIdentityKey } from '../../hooks/useSchemaForm'
import { cn } from '@/lib/utils'
import type { CustomProperty } from '@/types'
import { FieldRow } from './fieldmap/FieldRow'
import { CategoryCard } from './fieldmap/CategoryCard'

// ── Constants ──────────────────────────────────────────────────────────────────

const REQUIRED_FIELDS: {
  key: 'userIdField' | 'eventNameField' | 'timestampField'
  label: string
}[] = [
  { key: 'userIdField', label: 'User ID' },
  { key: 'eventNameField', label: 'Event Name' },
  { key: 'timestampField', label: 'Timestamp' },
]

const USER_IDENTITY_FIELDS: { key: UserIdentityKey; label: string }[] = [
  { key: 'email_field', label: 'Email' },
  { key: 'first_name_field', label: 'First Name' },
  { key: 'last_name_field', label: 'Last Name' },
  { key: 'date_of_birth_field', label: 'Date of Birth' },
  { key: 'phone_field', label: 'Phone' },
]

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  connId: string
}

export function FieldMapStep({ connId }: Props) {
  const {
    form,
    updateForm,
    setForm,
    pendingDetections,
    setPendingDetections,
    detectedColumns,
    enabledFields,
    setEnabledFields,
    detect,
    handleDetect,
    acceptDetection,
    rejectDetection,
    acceptAllDetections,
    upsert,
  } = useSchemaForm(connId)

  // Block all React Router navigation while there are pending detections.
  const blocker = useBlocker(pendingDetections.length > 0)

  const colNames = detectedColumns.map((c) => c.name)

  // Exclude columns already mapped to required/identity fields from event property suggestions.
  // Also exclude columns pending as identity suggestions to avoid offering them in props.
  const identityKeys = new Set(USER_IDENTITY_FIELDS.map((f) => f.key))
  const pendingIdentityPaths = pendingDetections
    .filter((d) => identityKeys.has(d.fieldKey as UserIdentityKey))
    .map((d) => d.proposedColumn)

  const usedPaths = new Set(
    [
      form.userIdField,
      form.eventNameField,
      form.timestampField,
      ...Object.values(form.userIdentityFields).filter(Boolean),
      ...pendingIdentityPaths,
    ].filter(Boolean) as string[]
  )
  const propColNames = colNames.filter((c) => !usedPaths.has(c))

  // Identity: show "N more optional" toggle if all remaining are empty and unmapped
  const [identityExpanded, setIdentityExpanded] = useState(false)
  const mappedIdentityCount = Object.values(form.userIdentityFields).filter(Boolean).length
  const identityPendingCount = pendingDetections.filter((d) =>
    USER_IDENTITY_FIELDS.some((f) => f.key === d.fieldKey)
  ).length
  // Show all when any are mapped, any have suggestions, or user clicked expand
  const showAllIdentity = identityExpanded || mappedIdentityCount > 0 || identityPendingCount > 0
  const visibleIdentityFields = showAllIdentity
    ? USER_IDENTITY_FIELDS
    : USER_IDENTITY_FIELDS.slice(0, 2)
  const hiddenCount = USER_IDENTITY_FIELDS.length - visibleIdentityFields.length

  // Required field counts
  const mappedRequiredCount = REQUIRED_FIELDS.filter((f) => !!form[f.key]).length

  function toggleFilter(field: string, label: string, icon: string) {
    setEnabledFields((prev) => {
      const next = { ...prev }
      if (next[field]) delete next[field]
      else next[field] = { label, icon }
      return next
    })
  }

  function setUserIdentityField(key: UserIdentityKey, value: string | null) {
    const previous = form.userIdentityFields[key]
    updateForm({ userIdentityFields: { ...form.userIdentityFields, [key]: value } })
    if (value === null && previous) {
      setEnabledFields((prev) => {
        const next = { ...prev }
        delete next[previous]
        return next
      })
    }
  }

  function removeProp(idx: number) {
    setForm((prev) => ({
      ...prev,
      customProps: prev.customProps.filter((_, i) => i !== idx),
    }))
  }

  function addProp() {
    setForm((prev) => ({
      ...prev,
      customProps: [
        ...prev.customProps,
        { id: crypto.randomUUID(), name: '', path: '', type: 'string', category: undefined },
      ],
    }))
  }

  function updateProp(idx: number, patch: Partial<CustomProperty>) {
    setForm((prev) => ({
      ...prev,
      customProps: prev.customProps.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }))
  }

  // Group props by category (null = no category); named categories first alphabetically, null last
  const categoryGroups = useMemo(() => {
    const map = new Map<string | null, Array<{ prop: CustomProperty; idx: number }>>()
    form.customProps.forEach((prop, idx) => {
      // Treat category "other" (catch-all) and uncategorized the same — both go to the "Other" group
      const key = !prop.category || prop.category === 'other' ? null : prop.category
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push({ prop, idx })
    })
    type Group = [string | null, Array<{ prop: CustomProperty; idx: number }>]
    const sortProps = (arr: Array<{ prop: CustomProperty; idx: number }>) =>
      [...arr].sort((a, b) =>
        a.prop.name.localeCompare(b.prop.name, undefined, { sensitivity: 'base' })
      )
    const groups: Group[] = [...map.entries()].map(([k, v]) => [k, sortProps(v)] as Group)
    // Sort: named categories alphabetically, null (Other) always last
    groups.sort((a, b) => {
      if (a[0] === null) return 1
      if (b[0] === null) return -1
      return a[0].localeCompare(b[0])
    })
    return groups
  }, [form.customProps])

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      {/* ── Detect banner ───────────────────────────────────────────────── */}
      {pendingDetections.length > 0 && (
        <div
          data-testid="detect-banner"
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs font-medium text-primary">
              {pendingDetections.length} field{pendingDetections.length !== 1 ? 's' : ''}{' '}
              auto-detected from schema
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" className="h-9 text-xs" onClick={acceptAllDetections}>
              Accept all
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 text-xs text-muted-foreground"
              onClick={() => setPendingDetections([])}
              title="Clear all suggestions without applying"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* ── Required Fields ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Required Fields
            </span>
            <SaveStatus
              status={
                upsert.isPending
                  ? 'saving'
                  : upsert.isSuccess
                    ? 'saved'
                    : upsert.isError
                      ? 'error'
                      : 'idle'
              }
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {mappedRequiredCount} / {REQUIRED_FIELDS.length} mapped
            </span>
            {form.eventsTable && (
              <Button
                size="sm"
                variant="outline"
                className="h-9 text-xs"
                data-testid="detect-btn"
                onClick={handleDetect}
                disabled={detect.isPending}
              >
                <ScanSearch className="h-3 w-3 mr-1.5" />
                {detect.isPending ? 'Detecting…' : 'Detect from schema'}
              </Button>
            )}
          </div>
        </div>

        {REQUIRED_FIELDS.map(({ key, label }) => {
          const pending = pendingDetections.find((d) => d.fieldKey === key)
          const value = form[key]
          return (
            <FieldRow
              key={key}
              testId={`field-row-${key}`}
              label={label}
              required
              value={value}
              pending={pending}
              colNames={colNames}
              filterEnabled={!!value && !!enabledFields[value]}
              onFilterToggle={() => {
                if (!value) return
                toggleFilter(value, label, 'Activity')
              }}
              onAccept={() => acceptDetection(key)}
              onReject={() => rejectDetection(key)}
              onChange={(v) => {
                updateForm({ [key]: v } as Parameters<typeof updateForm>[0])
                setPendingDetections((prev) => prev.filter((d) => d.fieldKey !== key))
              }}
            />
          )
        })}
      </div>

      {/* ── User Identity ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            User Identity
          </span>
          <div className="flex items-center gap-2">
            {identityPendingCount > 0 && (
              <span className="text-[10px] text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full dark:bg-indigo-900/30 dark:text-indigo-300">
                {identityPendingCount} suggested
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {mappedIdentityCount} / {USER_IDENTITY_FIELDS.length} mapped
            </span>
          </div>
        </div>

        {visibleIdentityFields.map(({ key, label }) => {
          const pending = pendingDetections.find((d) => d.fieldKey === key)
          const value = form.userIdentityFields[key] ?? ''
          return (
            <FieldRow
              key={key}
              testId={`identity-row-${key}`}
              label={label}
              required={false}
              value={value}
              pending={pending}
              colNames={colNames}
              filterEnabled={!!value && !!enabledFields[value]}
              onFilterToggle={() => {
                if (!value) return
                toggleFilter(value, label, 'CircleUserRound')
              }}
              onAccept={() => acceptDetection(key)}
              onReject={() => rejectDetection(key)}
              onChange={(v) => {
                setUserIdentityField(key, v || null)
                setPendingDetections((prev) => prev.filter((d) => d.fieldKey !== key))
              }}
              onClear={() => {
                setUserIdentityField(key, null)
                setPendingDetections((prev) => prev.filter((d) => d.fieldKey !== key))
              }}
            />
          )
        })}

        {hiddenCount > 0 && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground text-center py-1"
            onClick={() => setIdentityExpanded(true)}
          >
            + {hiddenCount} more optional field{hiddenCount !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* ── Event Properties ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Event Properties
          </span>
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={addProp}>
            <Plus className="h-3 w-3 mr-1" />
            Add property
          </Button>
        </div>

        {form.customProps.length === 0 && (
          <button
            type="button"
            onClick={addProp}
            className={cn(
              'w-full border border-dashed border-border rounded-lg flex items-center justify-center py-8',
              'hover:border-primary/50 hover:bg-muted/30 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
            )}
          >
            <span className="text-xs text-muted-foreground">+ Add your first event property</span>
          </button>
        )}

        {form.customProps.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {categoryGroups.map(([cat, groupProps]) => (
              <CategoryCard
                key={cat ?? '__none__'}
                category={cat}
                props={groupProps}
                colNames={propColNames}
                enabledFields={enabledFields}
                expanded={pendingDetections.length > 0}
                onFilterToggleProp={(idx) => {
                  const p = groupProps.find((gp) => gp.idx === idx)
                  if (!p?.prop.path) return
                  toggleFilter(p.prop.path, p.prop.name || p.prop.path, 'Activity')
                }}
                onChangeCategory={(newCat) => {
                  const idxSet = new Set(groupProps.map((gp) => gp.idx))
                  setForm((prev) => ({
                    ...prev,
                    customProps: prev.customProps.map((p, i) =>
                      idxSet.has(i) ? { ...p, category: newCat ?? undefined } : p
                    ),
                  }))
                }}
                onChangeProp={(idx, patch) => updateProp(idx, patch)}
                onRemoveProp={(idx) => removeProp(idx)}
                onAddToCategory={() => {
                  const category = cat ?? undefined
                  setForm((prev) => ({
                    ...prev,
                    customProps: [
                      ...prev.customProps,
                      { id: crypto.randomUUID(), name: '', path: '', type: 'string', category },
                    ],
                  }))
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Pending detections leave guard ──────────────────────────────── */}
      <Dialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
      >
        <DialogContent data-testid="leave-guard-dialog">
          <DialogHeader>
            <DialogTitle>Unconfirmed suggestions</DialogTitle>
            <DialogDescription>
              You have {pendingDetections.length} auto-detected field
              {pendingDetections.length !== 1 ? 's' : ''} waiting for review. Accept them all now,
              or stay on this step to confirm each one individually.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              Stay and review
            </Button>
            <Button variant="outline" onClick={() => blocker.proceed?.()}>
              Leave anyway
            </Button>
            <Button
              onClick={() => {
                acceptAllDetections()
                blocker.proceed?.()
              }}
            >
              Accept all &amp; continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
