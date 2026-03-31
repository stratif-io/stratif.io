import {
  Timer,
  Activity,
  CircleUserRound,
  Globe2,
  Laptop,
  Target,
  MoreHorizontal,
  BarChart2,
  Monitor,
  type LucideProps,
} from 'lucide-react'
import type { ComponentType } from 'react'

const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  Timer,
  Activity,
  CircleUserRound,
  Globe2,
  Laptop,
  Target,
  MoreHorizontal,
  BarChart2,
  Monitor,
}

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICON_MAP[name]
  if (!Icon) return null
  return <Icon {...props} />
}
