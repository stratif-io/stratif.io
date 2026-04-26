import { CATEGORY_ICON_MAP } from './categoryIconMap'
import type { LucideProps } from 'lucide-react'

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = CATEGORY_ICON_MAP[name]
  if (!Icon) return null
  return <Icon {...props} />
}
