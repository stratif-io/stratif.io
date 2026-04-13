import { useEffect, useRef, useState } from 'react'
import type {
  CustomProperty,
  DimensionCategoryConfig,
  PropertyType,
  SchemaDetectColumn,
} from '@/types'
import dimensionCategories from '@/config/dimension-categories.json'
import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
import {
  useSchemaConfig,
  useFilterConfig,
  useUpsertSchemaConfig,
  useUpsertFilterConfig,
  useDetectSchema,
} from './useConnectionsData'

export type UserIdentityKey =
  | 'email_field'
  | 'first_name_field'
  | 'last_name_field'
  | 'date_of_birth_field'
  | 'phone_field'

export type SchemaFormState = {
  userIdField: string
  timestampField: string
  eventNameField: string
  eventsTable: string
  sessionTimeoutMinutes: number
  resurrectionWindowDays: number
  powerUserThresholdDays: number
  customProps: CustomProperty[]
  userIdentityFields: Record<UserIdentityKey, string | null>
}

export type PendingDetection = {
  fieldKey: string
  label: string
  proposedColumn: string
}

const DEFAULT_FORM: SchemaFormState = {
  userIdField: '',
  timestampField: '',
  eventNameField: '',
  eventsTable: '',
  sessionTimeoutMinutes: 30,
  resurrectionWindowDays: 30,
  powerUserThresholdDays: 4,
  customProps: [],
  userIdentityFields: {
    email_field: null,
    first_name_field: null,
    last_name_field: null,
    date_of_birth_field: null,
    phone_field: null,
  },
}

export function useSchemaForm(connId: string) {
  const { data: schemaConfig } = useSchemaConfig(connId)
  const { data: filterConfig, isSuccess: filterConfigLoaded } = useFilterConfig(connId)
  const upsert = useUpsertSchemaConfig(connId)
  const upsertFilter = useUpsertFilterConfig(connId)
  const detect = useDetectSchema(connId)

  const [form, setForm] = useState<SchemaFormState>(DEFAULT_FORM)
  const [pendingDetections, setPendingDetections] = useState<PendingDetection[]>([])
  const [detectedColumns, setDetectedColumns] = useState<SchemaDetectColumn[]>([])
  const [enabledFields, setEnabledFields] = useState<
    Record<string, { label: string; icon: string }>
  >({})

  const initialized = useRef(false)
  const filterInitialized = useRef(false)
  const schemaTimer = useRef<ReturnType<typeof setTimeout>>()
  const filterTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!schemaConfig || initialized.current) return
    initialized.current = true
    setForm({
      userIdField: schemaConfig.user_id_field ?? '',
      timestampField: schemaConfig.timestamp_field ?? '',
      eventNameField: schemaConfig.event_name_field ?? '',
      eventsTable: schemaConfig.events_table ?? '',
      sessionTimeoutMinutes:
        schemaConfig.session_timeout_minutes ?? DEFAULT_FORM.sessionTimeoutMinutes,
      resurrectionWindowDays:
        schemaConfig.resurrection_window_days ?? DEFAULT_FORM.resurrectionWindowDays,
      powerUserThresholdDays:
        schemaConfig.power_user_threshold_days ?? DEFAULT_FORM.powerUserThresholdDays,
      customProps: schemaConfig.custom_properties ?? [],
      userIdentityFields: {
        email_field: schemaConfig.email_field ?? null,
        first_name_field: schemaConfig.first_name_field ?? null,
        last_name_field: schemaConfig.last_name_field ?? null,
        date_of_birth_field: schemaConfig.date_of_birth_field ?? null,
        phone_field: schemaConfig.phone_field ?? null,
      },
    })
  }, [schemaConfig])

  useEffect(() => {
    if (!filterConfigLoaded || filterInitialized.current) return
    filterInitialized.current = true
    const fields: Record<string, { label: string; icon: string }> = {}
    for (const f of filterConfig?.filter_fields ?? []) {
      fields[f.field] = { label: f.label, icon: f.icon }
    }
    setEnabledFields(fields)
  }, [filterConfigLoaded, filterConfig])

  useEffect(() => {
    if (!initialized.current) return
    clearTimeout(schemaTimer.current)
    schemaTimer.current = setTimeout(() => {
      upsert.mutate(buildSavePayload(form))
    }, 800)
    return () => clearTimeout(schemaTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- upsert/upsertFilter are new objects each render; only form/enabledFields changes should trigger saves
  }, [form])

  useEffect(() => {
    if (!filterInitialized.current) return
    clearTimeout(filterTimer.current)
    filterTimer.current = setTimeout(() => {
      upsertFilter.mutate({
        filter_fields: Object.entries(enabledFields).map(([field, { label, icon }]) => ({
          field,
          label,
          icon,
        })),
      })
    }, 600)
    return () => clearTimeout(filterTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- upsert/upsertFilter are new objects each render; only form/enabledFields changes should trigger saves
  }, [enabledFields])

  function updateForm(patch: Partial<SchemaFormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function handleDetect() {
    detect.mutate(form.eventsTable, {
      onSuccess: (data) => {
        if (data.events_table) updateForm({ eventsTable: data.events_table })
        if (data.columns?.length) {
          const topLevelCols = data.columns as SchemaDetectColumn[]
          const nestedCols = (data.proposed_custom_properties ?? []).map(
            (p: { path: string; type: string }) => ({ name: p.path, type: p.type })
          )
          const allCols = [...topLevelCols, ...nestedCols]
          setDetectedColumns(Array.from(new Map(allCols.map((c) => [c.name, c])).values()))
        }

        const pending: PendingDetection[] = []
        const fieldMap: Record<string, { key: string; label: string }> = {
          user_id_field: { key: 'userIdField', label: 'User ID' },
          event_name_field: { key: 'eventNameField', label: 'Event Name' },
          timestamp_field: { key: 'timestampField', label: 'Timestamp' },
          email_field: { key: 'email_field', label: 'Email' },
          first_name_field: { key: 'first_name_field', label: 'First Name' },
          last_name_field: { key: 'last_name_field', label: 'Last Name' },
          date_of_birth_field: { key: 'date_of_birth_field', label: 'Date of Birth' },
          phone_field: { key: 'phone_field', label: 'Phone' },
        }
        for (const [apiKey, { key, label }] of Object.entries(fieldMap)) {
          const suggested = (data.suggestions as Record<string, string | null>)[apiKey]
          if (suggested) {
            pending.push({ fieldKey: key, label, proposedColumn: suggested })
          }
        }
        setPendingDetections(pending)

        if (data.proposed_custom_properties?.length) {
          const proposals = data.proposed_custom_properties as Array<{
            name: string
            path: string
            type: PropertyType
          }>
          const allCats = dimensionCategories as DimensionCategoryConfig[]
          const groups = groupDimensionsByCategory(
            proposals.map((p) => ({ value: p.name, label: p.name })),
            allCats
          )
          const categoryMap = new Map<string, string>()
          for (const group of groups) {
            for (const dim of group.dimensions) categoryMap.set(dim.value, group.category.id)
          }
          const propsWithCategory: CustomProperty[] = proposals.map((p) => ({
            ...p,
            id: crypto.randomUUID(),
            category: categoryMap.get(p.name),
          }))
          setForm((prev) => {
            const reservedPaths = new Set([
              prev.userIdField,
              prev.eventNameField,
              prev.timestampField,
              ...Object.values(prev.userIdentityFields).filter(Boolean),
            ])
            const existingPaths = new Set(prev.customProps.map((cp) => cp.path))
            // Also remove any existing custom props that now conflict with reserved fields
            const cleanedProps = prev.customProps.filter((p) => !reservedPaths.has(p.path))
            const newProps = propsWithCategory.filter(
              (p) => !existingPaths.has(p.path) && !reservedPaths.has(p.path)
            )
            if (!newProps.length && cleanedProps.length === prev.customProps.length) return prev
            return { ...prev, customProps: [...cleanedProps, ...newProps] }
          })
        }
      },
    })
  }

  function acceptDetection(fieldKey: string) {
    const det = pendingDetections.find((d) => d.fieldKey === fieldKey)
    if (!det) return
    if (['userIdField', 'eventNameField', 'timestampField'].includes(fieldKey)) {
      updateForm({ [fieldKey]: det.proposedColumn } as Partial<SchemaFormState>)
    } else {
      updateForm({
        userIdentityFields: { ...form.userIdentityFields, [fieldKey]: det.proposedColumn },
      })
    }
    setPendingDetections((prev) => prev.filter((d) => d.fieldKey !== fieldKey))
  }

  function rejectDetection(fieldKey: string) {
    setPendingDetections((prev) => prev.filter((d) => d.fieldKey !== fieldKey))
  }

  function acceptAllDetections() {
    const identityPatch: Partial<Record<UserIdentityKey, string>> = {}
    const topLevelPatch: Partial<
      Pick<
        SchemaFormState,
        'userIdField' | 'eventNameField' | 'timestampField' | 'userIdentityFields'
      >
    > = {}
    for (const det of pendingDetections) {
      if (['userIdField', 'eventNameField', 'timestampField'].includes(det.fieldKey)) {
        topLevelPatch[det.fieldKey as 'userIdField' | 'eventNameField' | 'timestampField'] =
          det.proposedColumn
      } else {
        identityPatch[det.fieldKey as UserIdentityKey] = det.proposedColumn
      }
    }
    if (Object.keys(identityPatch).length) {
      topLevelPatch.userIdentityFields = { ...form.userIdentityFields, ...identityPatch }
    }
    if (Object.keys(topLevelPatch).length) updateForm(topLevelPatch)
    setPendingDetections([])
  }

  return {
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
    upsertFilter,
  }
}

function buildSavePayload(form: SchemaFormState) {
  return {
    user_id_field: form.userIdField,
    event_name_field: form.eventNameField,
    timestamp_field: form.timestampField,
    events_table: form.eventsTable,
    session_timeout_minutes: form.sessionTimeoutMinutes,
    resurrection_window_days: form.resurrectionWindowDays,
    power_user_threshold_days: form.powerUserThresholdDays,
    custom_properties: form.customProps,
    ...form.userIdentityFields,
  }
}
