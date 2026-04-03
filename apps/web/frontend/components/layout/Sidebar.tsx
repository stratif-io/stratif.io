import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboardIcon,
  TrendingUpIcon,
  FilterIcon,
  RepeatIcon,
  RouteIcon,
  TableIcon,
  UsersIcon,
  ActivityIcon,
  TerminalIcon,
  SettingsIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'
import { useConnections } from '@/features/connections/hooks/useConnectionsData'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { ConnectionIndicator } from './ConnectionIndicator'
import { UserMenu } from './UserMenu'

const ANALYTICS_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
  { to: '/trends', label: 'Trends', icon: TrendingUpIcon },
  { to: '/funnel', label: 'Funnels', icon: FilterIcon },
  { to: '/retention', label: 'Retention', icon: RepeatIcon },
  { to: '/paths', label: 'Paths', icon: RouteIcon },
  { to: '/pivot', label: 'Pivot', icon: TableIcon },
]

const DATA_NAV = [
  { to: '/people', label: 'People', icon: UsersIcon },
  { to: '/events', label: 'Events', icon: ActivityIcon },
  { to: '/query-studio', label: 'Query Studio', icon: TerminalIcon },
]

const SETTINGS_NAV = [{ to: '/connections', label: 'Connections', icon: SettingsIcon }]

interface NavSectionProps {
  label: string
  items: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[]
}

function NavSection({ label, items }: NavSectionProps) {
  return (
    <div className="mb-2">
      <p className="px-3 mb-1 text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground/60 select-none">
        {label}
      </p>
      {items.map(({ to, label: itemLabel, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 mx-1 px-2 py-1.5 rounded-lg text-[12px] transition-colors',
              isActive
                ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] font-semibold'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium'
            )
          }
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          {itemLabel}
        </NavLink>
      ))}
    </div>
  )
}

export function Sidebar() {
  const navigate = useNavigate()
  const { activeConnectionId, theme, setTheme } = useAppStore()
  const { data: connections } = useConnections()

  const activeConnection = connections?.find((c) => c.id === activeConnectionId)
  const { data: currentUser } = useCurrentUser()
  const username = currentUser?.username ?? 'you'

  function handleSignOut() {
    navigate('/sign-out')
  }

  return (
    <aside className="w-[200px] shrink-0 flex flex-col h-full bg-background border-r border-border">
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-2 border-b border-border/50">
        <div className="w-[26px] h-[26px] rounded-md bg-[hsl(var(--primary))] flex items-center justify-center shrink-0">
          <span className="text-[10px] font-black text-white leading-none">S</span>
        </div>
        <span className="text-[13px] font-bold text-foreground tracking-tight">
          {'<stratif.io>'}
        </span>
      </div>

      {/* Connection indicator */}
      <div className="px-2 py-2 border-b border-border/50">
        <ConnectionIndicator
          connectionName={activeConnection?.name ?? null}
          onClick={() => navigate('/connections')}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-1 py-3">
        <NavSection label="Analytics" items={ANALYTICS_NAV} />
        <NavSection label="Data" items={DATA_NAV} />
        <NavSection label="Settings" items={SETTINGS_NAV} />
      </nav>

      {/* User footer */}
      <div className="px-2 py-2 border-t border-border/50">
        <UserMenu
          username={username}
          currentTheme={theme}
          onThemeChange={setTheme}
          onSignOut={handleSignOut}
        />
      </div>
    </aside>
  )
}
