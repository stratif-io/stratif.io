import { useState, useCallback, useEffect } from 'react'
import { executeQueryStudio } from '@/lib/api'
import { useAppStore } from '@/stores'
import type { QueryStudioResponse } from '@/types'

const MAX_HISTORY = 20

export interface UseQueryStudioReturn {
  sql: string
  setSql: (sql: string) => void
  result: QueryStudioResponse | null
  isRunning: boolean
  history: string[]
  execute: (limit: number | null) => Promise<void>
  restoreFromHistory: (sql: string) => void
}

export function useQueryStudio(): UseQueryStudioReturn {
  const activeConnectionId = useAppStore((s) => s.activeConnectionId)
  const pendingQueryStudioSql = useAppStore((s) => s.pendingQueryStudioSql)
  const setPendingQueryStudioSql = useAppStore((s) => s.setPendingQueryStudioSql)
  const [sql, setSql] = useState(() => useAppStore.getState().pendingQueryStudioSql ?? '')

  useEffect(() => {
    if (pendingQueryStudioSql) {
      setSql(pendingQueryStudioSql)
      setPendingQueryStudioSql(null)
    }
  }, [pendingQueryStudioSql, setPendingQueryStudioSql])
  const [result, setResult] = useState<QueryStudioResponse | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [history, setHistory] = useState<string[]>([])

  const execute = useCallback(
    async (limit: number | null) => {
      if (!sql.trim()) return
      const trimmed = sql.trim()
      const hasLimit = /\blimit\b/i.test(trimmed)
      const finalSql = limit !== null && !hasLimit ? `${trimmed}\nLIMIT ${limit}` : trimmed
      setIsRunning(true)
      try {
        const response = await executeQueryStudio({
          sql: finalSql,
          connection_id: activeConnectionId ?? undefined,
        })
        setResult(response)
        setHistory((prev) => [trimmed, ...prev].slice(0, MAX_HISTORY))
      } finally {
        setIsRunning(false)
      }
    },
    [sql, activeConnectionId]
  )

  const restoreFromHistory = useCallback((historySql: string) => {
    setSql(historySql)
  }, [])

  return { sql, setSql, result, isRunning, history, execute, restoreFromHistory }
}
