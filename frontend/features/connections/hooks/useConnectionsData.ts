// In OSS single-tenant mode, connections are configured via environment variables.
// These hooks return empty/stub data so components that used the multi-tenant
// connections API continue to compile without changes.
import type { FilterField, CustomProperty } from '@/types'

export function useConnections() {
  return { data: [], isLoading: false, error: null }
}

export function useFilterConfig(_connId: string) {
  return {
    data: null as { filter_fields: FilterField[] } | null,
    isLoading: false,
    error: null,
  }
}

export function useFilterOptions(_connId: string) {
  return { data: null as Record<string, string[]> | null, isLoading: false, error: null }
}

export function useConnection(_id: string) {
  return { data: undefined, isLoading: false, error: null }
}

export function useCreateConnection() {
  return { mutate: () => {}, isPending: false }
}

export function useUpdateConnection(_id: string) {
  return { mutate: () => {}, isPending: false }
}

export function useDeleteConnection() {
  return { mutate: () => {}, isPending: false }
}

export function useTestConnection() {
  return { mutate: () => {}, isPending: false }
}

export function useSchemaConfig(_connId: string) {
  return {
    data: null as { custom_properties: CustomProperty[] } | null,
    isLoading: false,
    error: null,
  }
}

export function useUpsertSchemaConfig(_connId: string) {
  return { mutate: () => {}, isPending: false }
}

export function useUpsertFilterConfig(_connId: string) {
  return { mutate: () => {}, isPending: false }
}

export function useConnectionString(_connId: string) {
  return { data: undefined, isLoading: false, error: null }
}

export function useDetectSchema(_connId: string) {
  return { mutate: () => {}, isPending: false }
}

export function useConnectionCredentials(_connId: string) {
  return { data: undefined, isLoading: false, error: null }
}

export function useConnectionTables(_connId: string, _enabled = false) {
  return { data: undefined, isLoading: false, error: null }
}
