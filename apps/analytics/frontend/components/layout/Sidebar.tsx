import { useNavigate, useLocation, Link } from 'react-router-dom'
import { AppSidebar } from '@stratif-io/design-system'
import type { SidebarSection } from '@stratif-io/design-system'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Repeat2,
  Route,
  Activity,
  Settings,
  Table,
  Database,
  Terminal,
} from 'lucide-react'

function FunnelIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      className={className}
    >
      <line x1="1" y1="4" x2="15" y2="4" />
      <line x1="3" y1="8" x2="13" y2="8" />
      <line x1="5" y1="12" x2="11" y2="12" />
    </svg>
  )
}

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string
  preload?: () => void
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
      {
        title: 'Mission Control',
        href: '/dashboard',
        icon: LayoutDashboard,
        preload: () => import('@/features/dashboard'),
      },
      {
        title: 'Trends',
        href: '/trends',
        icon: TrendingUp,
        preload: () => import('@/features/analytics'),
      },
      {
        title: 'Retention',
        href: '/retention',
        icon: Repeat2,
        preload: () => import('@/features/analytics'),
      },
      {
        title: 'Journey',
        href: '/paths',
        icon: Route,
        preload: () => import('@/features/analytics'),
      },
      {
        title: 'Funnel',
        href: '/funnel',
        icon: FunnelIcon,
      },
      {
        title: 'People',
        href: '/people',
        icon: Users,
        preload: () => import('@/features/people'),
      },
    ],
  },
  {
    title: 'Explore',
    icon: Database,
    items: [
      {
        title: 'Events',
        href: '/events',
        icon: Activity,
        preload: () => import('@/features/events'),
      },
      {
        title: 'Pivot',
        href: '/pivot',
        icon: Table,
        preload: () => import('@/features/analytics'),
      },
      {
        title: 'SQL Studio',
        href: '/query-studio',
        icon: Terminal,
        preload: () => import('@/features/query-studio/QueryStudioPage'),
      },
    ],
  },
  {
    title: 'Configuration',
    icon: Settings,
    items: [
      {
        title: 'Connections',
        href: '/connections',
        icon: Database,
        preload: () => import('@/features/connections'),
      },
    ],
  },
]

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)

  const sections: SidebarSection[] = navGroups.map((group) => ({
    label: group.title,
    items: group.items.map((item) => ({
      key: item.href,
      label: item.title,
      icon: <item.icon size={16} aria-hidden />,
      active: location.pathname === item.href || location.pathname.startsWith(item.href + '/'),
      onClick: () => {
        if (item.preload) item.preload()
        navigate(item.href)
      },
    })),
  }))

  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)

  return (
    <AppSidebar
      sections={sections}
      collapsed={!sidebarOpen}
      onCollapse={(v) => setSidebarOpen(!v)}
      brand={
        <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
          <img src="/favicon-color.svg" alt="stratif.io" className="h-7 w-7 shrink-0" />
          <span
            className={cn(
              'transition-[opacity,max-width] duration-200 overflow-hidden',
              sidebarOpen ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'
            )}
          >
            <img src="/text-light.svg" alt="" className="h-7 w-auto shrink-0 dark:hidden" />
            <img src="/text-dark.svg" alt="" className="h-7 w-auto shrink-0 hidden dark:block" />
          </span>
        </Link>
      }
    />
  )
}
