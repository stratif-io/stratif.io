import { ConnectionList } from './components/ConnectionList'
import { PageTransition } from '@/components/layout/PageTransition'
import { SPACING } from '@/lib/constants'

export function ConnectionsPage() {
  return (
    <PageTransition>
      <div className={SPACING.page}>
        <ConnectionList />
      </div>
    </PageTransition>
  )
}
