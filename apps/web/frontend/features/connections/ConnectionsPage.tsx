import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ConnectionList } from './components/ConnectionList'
import { PageTransition } from '@/components/layout/PageTransition'
import { SPACING } from '@/lib/constants'

export function ConnectionsPage() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    document.title = 'Connections — stratif.io'
  }, [])

  useEffect(() => {
    if (location.search) {
      navigate('/connections', { replace: true })
    }
  }, [])

  return (
    <PageTransition>
      <div className={SPACING.page}>
        <ConnectionList />
      </div>
    </PageTransition>
  )
}
