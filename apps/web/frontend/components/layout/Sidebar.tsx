import { Link, useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  TrendingUp,
  Users,
  Route,
  Activity,
  Settings,
  Table,
  Database,
  Palette,
  Terminal,
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string
}

interface NavGroup {
  title: string
  icon: React.ElementType
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: 'Analytics',
    icon: LayoutDashboard,
    items: [
      { title: 'Mission Control', href: '/dashboard', icon: LayoutDashboard },
      { title: 'Trends', href: '/trends', icon: TrendingUp },
      { title: 'Retention', href: '/retention', icon: Users },
      { title: 'Paths', href: '/paths', icon: Route },
    ],
  },
  {
    title: 'Data',
    icon: Database,
    items: [
      { title: 'Events', href: '/events', icon: Activity },
      { title: 'Pivot Explorer', href: '/pivot', icon: Table },
    ],
  },
  {
    title: 'Configuration',
    icon: Settings,
    items: [{ title: 'Connections', href: '/connections', icon: Database }],
  },
  ...(import.meta.env.DEV
    ? [
        {
          title: 'Developer',
          icon: Palette,
          items: [{ title: 'Design System', href: '/design-system', icon: Palette }],
        } satisfies NavGroup,
      ]
    : []),
]

function NavLink({
  item,
  collapsed,
  onClick,
}: {
  item: NavItem
  collapsed: boolean
  onClick?: () => void
}) {
  const location = useLocation()
  const isActive = location.pathname === item.href

  const link = (
    <Link
      to={{ pathname: item.href, search: location.search }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
        collapsed ? 'justify-center px-2' : '',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span
        className={cn(
          'truncate min-w-0 transition-[opacity,max-width] duration-200',
          collapsed ? 'opacity-0 max-w-0 overflow-hidden' : 'opacity-100 max-w-xs'
        )}
      >
        {item.title}
      </span>
      {!collapsed && item.badge && (
        <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full leading-none">
          {item.badge}
        </span>
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {item.title}
        </TooltipContent>
      </Tooltip>
    )
  }

  return link
}

export function Sidebar() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const devMode = useAppStore((s) => s.devMode)
  const setDevMode = useAppStore((s) => s.setDevMode)
  const location = useLocation()

  const handleMobileNavClick = () => {
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          aria-hidden="true"
          tabIndex={-1}
          className="fixed inset-0 z-[var(--z-sidebar-overlay)] bg-background/80 backdrop-blur-sm lg:hidden cursor-default"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[var(--z-sidebar)] flex flex-col border-r bg-background transition-[width,transform] duration-300 ease-in-out',
          sidebarOpen
            ? 'w-[var(--sidebar-expanded)]'
            : 'w-[var(--sidebar-collapsed)] -translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-20 shrink-0 items-center border-b px-4">
          <Link
            to={{ pathname: '/dashboard', search: location.search }}
            className="flex items-center w-full gap-2 overflow-hidden"
          >
            <img src="/favicon-color.svg" alt="stratif.io" className="h-7 w-7 shrink-0" />
            <div
              className={cn(
                'flex flex-1 justify-center transition-[opacity,max-width] duration-200 overflow-hidden',
                sidebarOpen ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'
              )}
            >
              <img src="/text-light.svg" alt="" className="h-7 w-auto shrink-0 dark:hidden" />
              <img src="/text-dark.svg" alt="" className="h-7 w-auto shrink-0 hidden dark:block" />
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
          {navGroups.map((group, gi) => (
            <div
              key={group.title}
              className={cn('space-y-0.5', gi > 0 && 'pt-3 mt-3 border-t border-border/40')}
            >
              <div
                className={cn(
                  'transition-[opacity,max-height] duration-200 overflow-hidden',
                  sidebarOpen ? 'opacity-100 max-h-8' : 'opacity-0 max-h-0'
                )}
              >
                <p className="px-2.5 pb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
                  {group.title}
                </p>
              </div>
              {group.title === 'Configuration' && devMode && (
                <NavLink
                  item={{ title: 'Query Studio', href: '/query-studio', icon: Terminal }}
                  collapsed={!sidebarOpen}
                  onClick={handleMobileNavClick}
                />
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  collapsed={!sidebarOpen}
                  onClick={handleMobileNavClick}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Dev mode toggle — above the border */}
        <div
          className={cn(
            'shrink-0 px-2 py-2',
            sidebarOpen ? 'flex items-center justify-between' : 'flex justify-center'
          )}
        >
          {sidebarOpen && (
            <span className="text-[11px] font-semibold text-muted-foreground">Dev Mode</span>
          )}
          <Switch
            checked={devMode}
            onCheckedChange={setDevMode}
            aria-label="Toggle Dev Mode"
            className={cn(devMode && 'data-[state=checked]:bg-warning')}
          />
        </div>

        {/* Bottom section */}
        <div className="shrink-0 border-t px-2 py-2 space-y-0.5">
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-expanded={sidebarOpen}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors mt-1',
                !sidebarOpen && 'justify-center px-2'
              )}
            >
              <span className="shrink-0">
                {sidebarOpen ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ChevronRight className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      Expand sidebar
                    </TooltipContent>
                  </Tooltip>
                )}
              </span>
              <span
                className={cn(
                  'truncate text-sm transition-[opacity,max-width] duration-200',
                  sidebarOpen ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0 overflow-hidden'
                )}
              >
                Collapse
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
