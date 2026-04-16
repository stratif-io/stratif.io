import { QUERY_STALE_TIME } from '@/lib/constants'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createConnection,
  deleteConnection,
  fetchConnection,
  fetchConnectionCredentials,
  fetchConnectionString,
  fetchConnectionTables,
  fetchConnections,
  fetchFilterConfig,
  fetchFilterOptions,
  fetchSchemaConfig,
  fetchSchemaDetect,
  testConnection,
  updateConnection,
  upsertFilterConfig,
  upsertSchemaConfig,
} from '@/lib/api/queries'
import type {
  ConnectionCreate,
  ConnectionUpdate,
  FilterConfigBody,
  SchemaConfigBody,
} from '@/types'

export function useConnections() {
  return useQuery({
    queryKey: ['connections'],
    queryFn: () =>
      fetchConnections({
        meta: { cardName: 'Connection', querySnippet: 'connection list', auxiliary: true },
      }),
    staleTime: QUERY_STALE_TIME.default,
  })
}

export function useConnection(id: string) {
  return useQuery({
    queryKey: ['connections', id],
    queryFn: () =>
      fetchConnection(id, {
        meta: { cardName: 'Connection', querySnippet: 'connection details', auxiliary: true },
      }),
    enabled: !!id,
    staleTime: QUERY_STALE_TIME.default,
  })
}

export function useCreateConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ConnectionCreate) => createConnection(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connections'] }),
  })
}

export function useUpdateConnection(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ConnectionUpdate) => updateConnection(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections'] })
      qc.invalidateQueries({ queryKey: ['connections', id] })
    },
  })
}

export function useDeleteConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteConnection(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connections'] }),
  })
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (id: string) =>
      testConnection(id, {
        meta: { cardName: 'Connection', querySnippet: 'testing connection', auxiliary: true },
      }),
  })
}

export function useSchemaConfig(connId: string) {
  return useQuery({
    queryKey: ['connections', connId, 'schema'],
    queryFn: () =>
      fetchSchemaConfig(connId, {
        meta: { cardName: 'Connection', querySnippet: 'schema config', auxiliary: true },
      }),
    enabled: !!connId,
    retry: false,
    staleTime: QUERY_STALE_TIME.default,
  })
}

export function useUpsertSchemaConfig(connId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SchemaConfigBody) => upsertSchemaConfig(connId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connections', connId, 'schema'] }),
  })
}

export function useFilterConfig(connId: string) {
  return useQuery({
    queryKey: ['connections', connId, 'filters'],
    queryFn: () =>
      fetchFilterConfig(connId, {
        meta: { cardName: 'Connection', querySnippet: 'filter config', auxiliary: true },
      }),
    enabled: !!connId,
    retry: false,
    staleTime: QUERY_STALE_TIME.default,
  })
}

export function useUpsertFilterConfig(connId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: FilterConfigBody) => upsertFilterConfig(connId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections', connId, 'filters'] })
      qc.invalidateQueries({ queryKey: ['connections', connId, 'filter-options'] })
    },
  })
}

export function useFilterOptions(connId: string) {
  return useQuery({
    queryKey: ['connections', connId, 'filter-options'],
    queryFn: () =>
      fetchFilterOptions(connId, {
        meta: { cardName: 'Connection', querySnippet: 'filter options', auxiliary: true },
      }),
    enabled: !!connId,
    retry: false,
    staleTime: QUERY_STALE_TIME.default,
  })
}

export function useConnectionString(connId: string) {
  return useQuery({
    queryKey: ['connections', connId, 'string'],
    queryFn: () => fetchConnectionString(connId),
    enabled: !!connId,
    staleTime: QUERY_STALE_TIME.default,
  })
}

export function useDetectSchema(connId: string) {
  return useMutation({
    mutationFn: (eventsTable?: string) => fetchSchemaDetect(connId, eventsTable),
  })
}

export function useConnectionCredentials(connId: string) {
  return useQuery({
    queryKey: ['connections', connId, 'credentials'],
    queryFn: () => fetchConnectionCredentials(connId),
    enabled: !!connId,
    staleTime: QUERY_STALE_TIME.never,
  })
}

export function useConnectionTables(connId: string, enabled = false) {
  return useQuery({
    queryKey: ['connections', connId, 'tables'],
    queryFn: () =>
      fetchConnectionTables(connId, {
        meta: { cardName: 'Connection', querySnippet: 'loading tables', auxiliary: true },
      }),
    enabled: !!connId && enabled,
    staleTime: QUERY_STALE_TIME.default,
    retry: false,
  })
}
