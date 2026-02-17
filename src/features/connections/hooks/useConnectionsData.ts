import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createConnection,
  deleteConnection,
  fetchConnection,
  fetchConnections,
  fetchFilterConfig,
  fetchFilterOptions,
  fetchSchemaConfig,
  testConnection,
  updateConnection,
  upsertFilterConfig,
  upsertSchemaConfig,
} from '@/lib/api/queries'
import type { ConnectionCreate, ConnectionUpdate, FilterConfigBody, SchemaConfigBody } from '@/types'

export function useConnections() {
  return useQuery({
    queryKey: ['connections'],
    queryFn: fetchConnections,
  })
}

export function useConnection(id: string) {
  return useQuery({
    queryKey: ['connections', id],
    queryFn: () => fetchConnection(id),
    enabled: !!id,
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
    mutationFn: (id: string) => testConnection(id),
  })
}

export function useSchemaConfig(connId: string) {
  return useQuery({
    queryKey: ['connections', connId, 'schema'],
    queryFn: () => fetchSchemaConfig(connId),
    enabled: !!connId,
    retry: false,
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
    queryFn: () => fetchFilterConfig(connId),
    enabled: !!connId,
    retry: false,
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
    queryFn: () => fetchFilterOptions(connId),
    enabled: !!connId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}
