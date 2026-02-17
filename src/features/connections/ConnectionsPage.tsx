import { ConnectionList } from './components/ConnectionList'
import { SPACING } from '@/lib/constants'

export function ConnectionsPage() {
  return (
    <div className={SPACING.page}>
      <ConnectionList />
    </div>
  )
}
