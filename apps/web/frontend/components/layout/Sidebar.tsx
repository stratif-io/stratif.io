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
import { ConnectionIndicator } from './ConnectionIndicator'

const ANALYTICS_NAV = [
  { to: '/dashboard', label: 'Mission Control', icon: LayoutDashboardIcon },
  { to: '/trends', label: 'Trends', icon: TrendingUpIcon },
  { to: '/paths', label: 'Paths', icon: RouteIcon },
  { to: '/funnel', label: 'Funnels', icon: FilterIcon },
  { to: '/retention', label: 'Retention', icon: RepeatIcon },
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
  expanded: boolean
}

function NavSection({ label, items, expanded }: NavSectionProps) {
  return (
    <div className="mb-2">
      <p
        className={cn(
          'px-3 mb-1 text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground/60 select-none transition-opacity duration-200',
          expanded ? 'opacity-100' : 'opacity-0'
        )}
      >
        {label}
      </p>
      {items.map(({ to, label: itemLabel, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          title={!expanded ? itemLabel : undefined}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 mx-1 px-2 py-1.5 rounded-lg text-[12px] transition-colors',
              isActive
                ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] font-semibold'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium',
              !expanded && 'justify-center px-0'
            )
          }
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          {expanded && <span className="truncate">{itemLabel}</span>}
        </NavLink>
      ))}
    </div>
  )
}

export function Sidebar() {
  const navigate = useNavigate()
  const { activeConnectionId, sidebarOpen, setSidebarOpen } = useAppStore()
  const { data: connections } = useConnections()

  const activeConnection = connections?.find((c) => c.id === activeConnectionId)

  return (
    <aside
      className={cn(
        'shrink-0 flex flex-col h-full bg-background border-r border-border transition-[width] duration-300 ease-in-out overflow-hidden',
        sidebarOpen ? 'w-[200px]' : 'w-[52px]'
      )}
    >
      {/* Logo + collapse toggle */}
      <div className="px-2 py-3 flex items-center gap-2 border-b border-border/50 min-h-[48px]">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="shrink-0 w-[26px] h-[26px] rounded-md bg-[hsl(var(--primary))] flex items-center justify-center hover:opacity-80 transition-opacity"
        >
          <span className="text-[10px] font-black text-white leading-none">S</span>
        </button>
        {sidebarOpen && (
          <span className="flex-1 text-[13px] font-bold text-foreground tracking-tight truncate">
            {'<stratif.io>'}
          </span>
        )}
      </div>

      {/* Connection indicator */}
      <div
        className={cn(
          'border-b border-border/50 overflow-hidden transition-all duration-300',
          sidebarOpen ? 'px-2 py-2 max-h-[48px] opacity-100' : 'max-h-0 opacity-0 py-0 px-2'
        )}
      >
        <ConnectionIndicator
          connectionName={activeConnection?.name ?? null}
          onClick={() => navigate('/connections')}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-1 py-3">
        <NavSection label="Analytics" items={ANALYTICS_NAV} expanded={sidebarOpen} />
        <NavSection label="Data" items={DATA_NAV} expanded={sidebarOpen} />
        <NavSection label="Settings" items={SETTINGS_NAV} expanded={sidebarOpen} />
      </nav>
    </aside>
  )
}
