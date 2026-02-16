import { Link, useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  ChevronDown,
  BarChart3,
  TrendingUp,
  Users,
  Route,
  Filter,
  Activity,
  Settings,
  HelpCircle,
} from 'lucide-react'
import { useState } from 'react'

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
    icon: BarChart3,
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: Activity },
      { title: 'Trends', href: '/trends', icon: TrendingUp },
      { title: 'Retention', href: '/retention', icon: Users },
      { title: 'Paths', href: '/paths', icon: Route },
      { title: 'Funnels', href: '/funnels', icon: Filter },
      { title: 'Sessions', href: '/sessions', icon: Activity },
    ],
  },
  {
    title: 'Data',
    icon: BarChart3,
    items: [{ title: 'Events', href: '/events', icon: Activity }],
  },
]

const bottomNav: NavItem[] = [
  { title: 'Settings', href: '/settings', icon: Settings },
  { title: 'Help', href: '/help', icon: HelpCircle },
]

export function Sidebar() {
  const location = useLocation()
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const [openGroups, setOpenGroups] = useState<string[]>(['Analytics'])

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    )
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 border-r bg-background transition-all duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-16'
      )}
    >
      <div className="flex h-16 items-center border-b px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          {sidebarOpen && <span className="font-bold text-xl">OpenFlow</span>}
        </Link>
      </div>

      <nav className="space-y-4 p-4">
        {navGroups.map((group) => (
          <Collapsible
            key={group.title}
            open={openGroups.includes(group.title)}
            onOpenChange={() => toggleGroup(group.title)}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent">
              <div className="flex items-center gap-2">
                <group.icon className="h-4 w-4" />
                {sidebarOpen && <span>{group.title}</span>}
              </div>
              {sidebarOpen && (
                <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
              )}
            </CollapsibleTrigger>
            {sidebarOpen && (
              <CollapsibleContent className="space-y-1 pt-2">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                      location.pathname === item.href
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    {item.badge && (
                      <span className="ml-auto text-xs bg-primary/10 px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </CollapsibleContent>
            )}
          </Collapsible>
        ))}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 border-t p-4">
        {bottomNav.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
              location.pathname === item.href
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {sidebarOpen && <span>{item.title}</span>}
          </Link>
        ))}
      </div>
    </aside>
  )
}
