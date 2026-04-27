import type { ReactNode } from 'react'

interface ComponentSectionProps {
  id: string
  title: string
  children: ReactNode
}

export function ComponentSection({ id, title, children }: ComponentSectionProps) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-border">{title}</h2>
      <div className="space-y-6">{children}</div>
    </section>
  )
}

interface ComponentRowProps {
  label: string
  children: ReactNode
}

export function ComponentRow({ label, children }: ComponentRowProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-mono text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}
