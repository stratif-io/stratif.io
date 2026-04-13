import { useMemo, useState } from 'react'
import { ScanSearch, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SaveStatus } from '@/components/ui/save-status'
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

  const colNames = detectedColumns.map((c) => c.name)

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

  function addProp() {
    updateForm({
      customProps: [
        ...form.customProps,
        { id: crypto.randomUUID(), name: '', path: '', type: 'string', category: undefined },
      ],
    })
  }

  function removeProp(idx: number) {
    updateForm({ customProps: form.customProps.filter((_, i) => i !== idx) })
  }

  function updateProp(idx: number, patch: Partial<CustomProperty>) {
    updateForm({
      customProps: form.customProps.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    })
  }

  // Group props by category (null = no category); named categories first alphabetically, null last
  const categoryGroups = useMemo(() => {
    const map = new Map<string | null, Array<{ prop: CustomProperty; idx: number }>>()
    form.customProps.forEach((prop, idx) => {
      const key = prop.category ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push({ prop, idx })
    })
    type Group = [string | null, Array<{ prop: CustomProperty; idx: number }>]
    const named = [...map.entries()]
      .filter(([k]) => k !== null)
      .sort(([a], [b]) => a!.localeCompare(b!)) as Group[]
    const nullGroup: Group[] = map.has(null) ? [[null, map.get(null)!]] : []
    return [...named, ...nullGroup]
  }, [form.customProps])

  return (
    <div className="flex flex-col gap-6 p-1">
      {/* ── Detect banner ───────────────────────────────────────────────── */}
      {pendingDetections.length > 0 && (
        <div
          data-testid="detect-banner"
          className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 dark:border-blue-800 dark:bg-blue-950/40"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
              {pendingDetections.length} field{pendingDetections.length !== 1 ? 's' : ''}{' '}
              auto-detected from schema
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" className="h-7 text-xs" onClick={acceptAllDetections}>
              Accept all
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setPendingDetections([])}
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
                className="h-7 text-xs"
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
              onChange={(v) => updateForm({ [key]: v } as Parameters<typeof updateForm>[0])}
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
              onChange={(v) => setUserIdentityField(key, v || null)}
              onClear={() => setUserIdentityField(key, null)}
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
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addProp}>
            <Plus className="h-3 w-3 mr-1" />
            Add property
          </Button>
        </div>

        {form.customProps.length === 0 && (
          <div
            className={cn(
              'border border-dashed border-border rounded-lg flex items-center justify-center py-8 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors'
            )}
            onClick={addProp}
          >
            <span className="text-xs text-muted-foreground">+ Add your first event property</span>
          </div>
        )}

        {form.customProps.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {categoryGroups.map(([cat, groupProps]) => (
              <CategoryCard
                key={cat ?? '__none__'}
                category={cat}
                props={groupProps}
                colNames={colNames}
                enabledFields={enabledFields}
                onFilterToggleProp={(idx) => {
                  const p = groupProps.find((gp) => gp.idx === idx)
                  if (!p?.prop.path) return
                  toggleFilter(p.prop.path, p.prop.name || p.prop.path, 'Activity')
                }}
                onChangeCategory={(newCat) => {
                  const idxSet = new Set(groupProps.map((gp) => gp.idx))
                  updateForm({
                    customProps: form.customProps.map((p, i) =>
                      idxSet.has(i) ? { ...p, category: newCat ?? undefined } : p
                    ),
                  })
                }}
                onChangeProp={(idx, patch) => updateProp(idx, patch)}
                onRemoveProp={(idx) => removeProp(idx)}
                onAddToCategory={() => {
                  updateForm({
                    customProps: [
                      ...form.customProps,
                      {
                        id: crypto.randomUUID(),
                        name: '',
                        path: '',
                        type: 'string',
                        category: cat ?? undefined,
                      },
                    ],
                  })
                }}
              />
            ))}

            {/* Trailing "add" card */}
            <div
              className="border border-dashed border-border rounded-lg flex items-center justify-center min-h-[120px] cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={addProp}
            >
              <span className="text-xs text-muted-foreground">+ Add property</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
