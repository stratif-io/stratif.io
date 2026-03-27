import { Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { QueryStatusIndicator } from './QueryStatusIndicator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useUrlSync } from '@/hooks'

const FULL_BLEED_ROUTES = ['/query-studio']

export function DashboardLayout() {
  useUrlSync()
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const location = useLocation()
  const fullBleed = FULL_BLEED_ROUTES.includes(location.pathname)

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div
          className={cn(
            'flex flex-col flex-1 min-w-0 transition-[margin] duration-300 ease-in-out',
            sidebarOpen ? 'lg:ml-[var(--sidebar-expanded)]' : 'lg:ml-[var(--sidebar-collapsed)]'
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
            <div className="absolute top-3 right-4 lg:right-6 z-10">
              <QueryStatusIndicator />
            </div>
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
