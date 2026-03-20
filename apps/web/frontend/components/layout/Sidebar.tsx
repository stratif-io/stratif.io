import { Link, useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
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
    items: [
      { title: 'Connections', href: '/connections', icon: Database },
    ],
  },
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
      {!collapsed && <span className="truncate min-w-0">{item.title}</span>}
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
  const location = useLocation()

  const handleMobileNavClick = () => {
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  return (
    <TooltipProvider delayDuration={200}>
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
        <div className="flex h-14 shrink-0 items-center border-b px-3">
          <Link
            to={{ pathname: '/dashboard', search: location.search }}
            className={cn(
              'flex items-center overflow-hidden',
              sidebarOpen ? 'gap-1.5' : 'justify-center w-full'
            )}
          >
            <span className="text-xs text-muted-foreground shrink-0">$</span>
            {sidebarOpen && (
              <span className="text-sm font-bold tracking-tight text-foreground whitespace-nowrap">
                stratif.io
              </span>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
          {sidebarOpen ? (
            /* Expanded: flat groups separated by dividers */
            navGroups.map((group, gi) => (
              <div key={group.title} className={cn('space-y-0.5', gi > 0 && 'pt-3 mt-3 border-t border-border/40')}>
                <p className="px-2.5 pb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
                  {group.title}
                </p>
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    collapsed={false}
                    onClick={handleMobileNavClick}
                  />
                ))}
              </div>
            ))
          ) : (
            /* Collapsed: icon rail */
            <>
              {navGroups.map((group, gi) => (
                <div
                  key={group.title}
                  className={cn('space-y-0.5', gi > 0 && 'pt-2 mt-2 border-t border-border/50')}
                >
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      collapsed={true}
                      onClick={handleMobileNavClick}
                    />
                  ))}
                </div>
              ))}
            </>
          )}
        </nav>

        {/* Bottom section */}
        <div className="shrink-0 border-t px-2 py-2 space-y-0.5">
          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={sidebarOpen}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors mt-1',
              !sidebarOpen && 'justify-center px-2'
            )}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4 shrink-0" />
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Expand sidebar
                </TooltipContent>
              </Tooltip>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
