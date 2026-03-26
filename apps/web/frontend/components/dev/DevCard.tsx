import { useState } from 'react'
import { format as formatSql } from 'sql-formatter'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'

function prettySql(q: string): string {
  try {
    return formatSql(q, { language: 'sql', tabWidth: 2, keywordCase: 'upper' })
  } catch {
    return q
  }
}

interface DevCardProps {
  sql?: string | string[] | null
  children: React.ReactNode
  className?: string
}

export function DevCard({ sql, children, className }: DevCardProps) {
  const devMode = useAppStore((s) => s.devMode)
  const [flipped, setFlipped] = useState(false)

  if (!devMode) return <>{children}</>

  const queries = sql ? (Array.isArray(sql) ? sql : [sql]) : []

  return (
    <div className={cn('relative', className)} style={{ perspective: '1000px' }}>
      <div
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.4s ease',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          position: 'relative',
        }}
      >
        {/* Front face */}
        <div style={{ backfaceVisibility: 'hidden' }}>
          {children}
          <button
            onClick={() => setFlipped(true)}
            aria-label="Show SQL"
            className="absolute top-2 right-2 z-10 rounded px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 border border-amber-300 text-amber-800 hover:bg-amber-200 transition-colors"
          >
            SQL
          </button>
        </div>

        {/* Back face */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            position: 'absolute',
            inset: 0,
          }}
          className="bg-[#1e1e2e] rounded-[inherit] overflow-auto p-3"
        >
          {flipped && (
            <button
              onClick={() => setFlipped(false)}
              aria-label="Close SQL"
              className="absolute top-2 right-2 z-10 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
            >
              ✕
            </button>
          )}
          {queries.length === 0 ? (
            <p className="text-[10px] text-slate-500 italic">No SQL available</p>
          ) : (
            queries.map((q, i) => (
              <div key={i}>
                {queries.length > 1 && (
                  <p className="text-[9px] text-slate-500 mb-1 font-mono">-- Query {i + 1}</p>
                )}
                <pre className="text-[10px] leading-relaxed text-green-300 font-mono whitespace-pre-wrap break-all">
                  {prettySql(q)}
                </pre>
                {i < queries.length - 1 && <hr className="my-2 border-slate-700" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
