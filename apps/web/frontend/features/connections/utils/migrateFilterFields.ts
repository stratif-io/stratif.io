import type { FilterField, SchemaConfig } from '@/types'

const SYSTEM_FIELD_KEYS = [
  'user_id_field',
  'event_name_field',
  'timestamp_field',
  'email_field',
  'first_name_field',
  'last_name_field',
  'date_of_birth_field',
  'phone_field',
] as const

/**
 * Migrates legacy filter fields (field path string, no ref) to ref-based entries.
 * Called when loading a saved filterConfig from the API.
 *
 * Legacy: { ref: "", field: "country", label: "Country", icon: "..." }
 * New:    { ref: "<uuid>", field: "", label: "Country", icon: "..." }
 *
 * Migration strategy:
 * - If ref is non-empty: already migrated, keep as-is
 * - If ref is "" and field is non-empty: try to match against custom properties by path,
 *   then by system field values
 * - If no match found: drop the entry (orphaned filter)
 */
export function migrateFilterFields(
  filterFields: FilterField[],
  schemaConfig: SchemaConfig
): FilterField[] {
  return filterFields.flatMap((ff) => {
    // Already migrated
    if (ff.ref) return [ff]

    const legacyPath = ff.field
    if (!legacyPath) return [] // nothing to match against

    // Try to match against custom properties by path
    const customProp = schemaConfig.custom_properties?.find((p) => p.path === legacyPath && p.id)
    if (customProp) {
      return [{ ...ff, ref: customProp.id!, field: '' }]
    }

    // Try to match against system/identity fields by value
    for (const key of SYSTEM_FIELD_KEYS) {
      const value = (schemaConfig as unknown as Record<string, unknown>)[key]
      if (typeof value === 'string' && value === legacyPath) {
        return [{ ...ff, ref: `$${key}`, field: '' }]
      }
    }

    // No match — drop orphaned entry
    return []
  })
}
