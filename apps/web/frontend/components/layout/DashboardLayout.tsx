import { Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useUrlSync } from '@/hooks'

const FULL_BLEED_ROUTES = ['/query-studio', '/people']

function isFullBleed(pathname: string, activeConnectionId: string | null): boolean {
  if (FULL_BLEED_ROUTES.includes(pathname) && !!activeConnectionId) return true
  // Connection detail pages (/connections/:id/...) but not the list or new form
  if (pathname.startsWith('/connections/') && pathname !== '/connections/new') return true
  return false
}

export function DashboardLayout() {
  useUrlSync()
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const activeConnectionId = useAppStore((state) => state.activeConnectionId)
  const location = useLocation()
  const fullBleed = isFullBleed(location.pathname, activeConnectionId)

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
          <Header />
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
