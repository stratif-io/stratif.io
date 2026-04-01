import { useAppStore } from '@/stores'
import { useLocation } from 'react-router-dom'
import { ConnectionSelector } from './ConnectionSelector'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Moon, Sun, Menu, Monitor } from 'lucide-react'
import { useTheme } from '@/hooks'
import { GlobalFilters } from '@/components/GlobalFilters'
import { QueryStatusIndicator } from './QueryStatusIndicator'
import { cn } from '@/lib/utils'

const GRANULARITY_ROUTES = new Set(['/trends', '/retention', '/dashboard'])

export function Header() {
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const devMode = useAppStore((s) => s.devMode)
  const { theme, setTheme } = useTheme()
  const { pathname } = useLocation()
  const granularityDisabled = !GRANULARITY_ROUTES.has(pathname)
  return (
    <header className="sticky top-0 z-[var(--z-header)] w-full border-b bg-background">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Connection selector */}
        <ConnectionSelector />

        {/* Filters — takes remaining space */}
        <div className="flex-1 min-w-0">
          <GlobalFilters granularityDisabled={granularityDisabled} />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <QueryStatusIndicator />
          <span
            aria-hidden={!devMode}
            className={cn(
              'flex items-center gap-1.5 text-xs text-muted-foreground/60 transition-opacity duration-200',
              devMode ? 'opacity-100' : 'invisible opacity-0'
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400/60" />
            Dev
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Change theme">
                {theme === 'system' ? (
                  <Monitor className="h-4 w-4" />
                ) : theme === 'dark' ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                role="menuitemradio"
                aria-checked={theme === 'light'}
                onClick={() => setTheme('light')}
              >
                <Sun className="mr-2 h-4 w-4" />
                Light
                {theme === 'light' && (
                  <span className="ml-auto text-xs text-muted-foreground">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                role="menuitemradio"
                aria-checked={theme === 'dark'}
                onClick={() => setTheme('dark')}
              >
                <Moon className="mr-2 h-4 w-4" />
                Dark
                {theme === 'dark' && (
                  <span className="ml-auto text-xs text-muted-foreground">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                role="menuitemradio"
                aria-checked={theme === 'system'}
                onClick={() => setTheme('system')}
              >
                <Monitor className="mr-2 h-4 w-4" />
                System
                {theme === 'system' && (
                  <span className="ml-auto text-xs text-muted-foreground">✓</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
