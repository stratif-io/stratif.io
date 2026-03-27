import { useAppStore } from '@/stores'
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
import { cn } from '@/lib/utils'

export function Header() {
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const devMode = useAppStore((s) => s.devMode)
  const { theme, setTheme } = useTheme()
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
          <GlobalFilters />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            aria-hidden={!devMode}
            className={cn(
              'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-opacity duration-200',
              'border-amber-400/60 bg-amber-500/10 text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-400',
              devMode ? 'opacity-100' : 'invisible opacity-0',
            )}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
            Development Mode
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Change theme">
                {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem role="menuitemradio" aria-checked={theme === 'light'} onClick={() => setTheme('light')}>
                <Sun className="mr-2 h-4 w-4" />
                Light
                {theme === 'light' && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem role="menuitemradio" aria-checked={theme === 'dark'} onClick={() => setTheme('dark')}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
                {theme === 'dark' && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem role="menuitemradio" aria-checked={theme === 'system'} onClick={() => setTheme('system')}>
                <Monitor className="mr-2 h-4 w-4" />
                System
                {theme === 'system' && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
