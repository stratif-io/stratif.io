import { Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores'
import { Sidebar } from './Sidebar'
import { GlobalFilters } from '@/components/GlobalFilters'
import { QueryStatusIndicator } from './QueryStatusIndicator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useUrlSync } from '@/hooks'

const FULL_BLEED_ROUTES = ['/query-studio', '/people']
const GRANULARITY_ROUTES = new Set(['/trends', '/retention', '/dashboard'])

export function DashboardLayout() {
  useUrlSync()
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const activeConnectionId = useAppStore((state) => state.activeConnectionId)
  const location = useLocation()
  const fullBleed = FULL_BLEED_ROUTES.includes(location.pathname) && !!activeConnectionId
  const granularityDisabled = !GRANULARITY_ROUTES.has(location.pathname)

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div
          className={cn(
            'flex flex-col flex-1 min-w-0 transition-[padding-left] duration-300 ease-in-out',
            sidebarOpen ? 'lg:pl-[var(--sidebar-expanded)]' : 'lg:pl-[var(--sidebar-collapsed)]'
          )}
        >
          <header className="sticky top-0 z-[var(--z-header)] w-full border-b bg-background">
            <div className="flex h-12 items-center gap-3 px-4">
              <div className="flex-1 min-w-0">
                <GlobalFilters granularityDisabled={granularityDisabled} />
              </div>
              <QueryStatusIndicator />
            </div>
          </header>
          <main
            id="main-content"
            className={cn(
              'relative flex-1 overflow-hidden',
              !fullBleed && 'overflow-y-auto p-4 sm:p-6 lg:p-8'
            )}
          >
            {fullBleed ? (
              <div className="h-full">
                <Outlet />
              </div>
            ) : (
              <div className="mx-auto w-full max-w-[var(--content-max-width)]">
                <Outlet />
              </div>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
