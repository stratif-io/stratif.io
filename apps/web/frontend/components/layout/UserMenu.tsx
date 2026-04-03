import { MoreHorizontalIcon, SunIcon, MoonIcon, MonitorIcon, LogOutIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

interface UserMenuProps {
  username: string
  currentTheme?: 'light' | 'dark' | 'system'
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
  onSignOut: () => void
}

export function UserMenu({
  username,
  currentTheme = 'system',
  onThemeChange,
  onSignOut,
}: UserMenuProps) {
  const initials = username.slice(0, 2).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={username}
          className="w-full flex items-center gap-2 px-1 py-1.5 rounded-lg hover:bg-muted/60 transition-colors"
        >
          <div className="shrink-0 w-6 h-6 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center">
            <span className="text-[9px] font-bold text-white">{initials}</span>
          </div>
          <span className="flex-1 text-[11px] font-medium text-foreground truncate">
            {username}
          </span>
          <MoreHorizontalIcon className="shrink-0 w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Theme
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onThemeChange('light')}>
          <SunIcon className="w-3.5 h-3.5 mr-2" />
          Light {currentTheme === 'light' && '✓'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onThemeChange('dark')}>
          <MoonIcon className="w-3.5 h-3.5 mr-2" />
          Dark {currentTheme === 'dark' && '✓'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onThemeChange('system')}>
          <MonitorIcon className="w-3.5 h-3.5 mr-2" />
          System {currentTheme === 'system' && '✓'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
          <LogOutIcon className="w-3.5 h-3.5 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
