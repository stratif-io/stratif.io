import { useAppStore } from '@/stores'
import { ConnectionSelector } from './ConnectionSelector'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Moon, Sun, Menu, Settings, Monitor } from 'lucide-react'
import { useTheme } from '@/hooks'
import { GlobalFilters } from '@/components/GlobalFilters'
import { useNavigate } from 'react-router-dom'

export function Header() {
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0 h-8 w-8"
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
        <div className="flex items-center gap-1 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="mr-2 h-4 w-4" />
                Light
                {theme === 'light' && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
                {theme === 'dark' && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Monitor className="mr-2 h-4 w-4" />
                System
                {theme === 'system' && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenuSeparator />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
