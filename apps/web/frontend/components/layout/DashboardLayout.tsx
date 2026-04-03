import { Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores'
import { Sidebar } from './Sidebar'
import { GlobalFilters } from '@/components/GlobalFilters'
import { QueryStatusIndicator } from './QueryStatusIndicator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUrlSync, useTheme } from '@/hooks'
import { SunIcon, MoonIcon, MonitorIcon } from 'lucide-react'

const FULL_BLEED_ROUTES = ['/query-studio', '/people']
const GRANULARITY_ROUTES = new Set(['/trends', '/retention', '/dashboard'])

export function DashboardLayout() {
  useUrlSync()
  const activeConnectionId = useAppStore((state) => state.activeConnectionId)
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const fullBleed = FULL_BLEED_ROUTES.includes(location.pathname) && !!activeConnectionId
  const granularityDisabled = !GRANULARITY_ROUTES.has(location.pathname)

  const ThemeIcon = theme === 'dark' ? MoonIcon : theme === 'light' ? SunIcon : MonitorIcon

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-[var(--z-header)] w-full border-b bg-background">
            <div className="flex h-12 items-center gap-3 px-4">
              <div className="flex-1 min-w-0">
                <GlobalFilters granularityDisabled={granularityDisabled} />
              </div>
              <QueryStatusIndicator />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Change theme"
                onClick={() =>
                  setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')
                }
                className="h-8 w-8 shrink-0"
              >
                <ThemeIcon className="h-4 w-4" />
              </Button>
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
