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
      {sidebarOpen && (
        <div className="px-2 py-2 border-b border-border/50">
          <ConnectionIndicator
            connectionName={activeConnection?.name ?? null}
            onClick={() => navigate('/connections')}
          />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-1 py-3">
        {sidebarOpen ? (
          <>
            <NavSection label="Analytics" items={ANALYTICS_NAV} />
            <NavSection label="Data" items={DATA_NAV} />
            <NavSection label="Settings" items={SETTINGS_NAV} />
          </>
        ) : (
          <div className="flex flex-col gap-0.5">
            {[...ANALYTICS_NAV, ...DATA_NAV, ...SETTINGS_NAV].map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={label}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-center mx-1 p-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
              </NavLink>
            ))}
          </div>
        )}
      </nav>
    </aside>
  )
}
