import { useState, createContext, useContext } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard, 
  BarChart3, 
  Users, 
  MousePointerClick, 
  Route, 
  Target,
  Settings,
  ChevronDown,
  FileText,
  Bell,
  HelpCircle,
  Zap,
  FolderOpen
} from 'lucide-react'

const SidebarContext = createContext(null)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

export function SidebarProvider({ children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  const [currentPage, setCurrentPage] = useState('dashboard')

  return (
    <SidebarContext.Provider value={{ open, setOpen, currentPage, setCurrentPage }}>
      {children}
    </SidebarContext.Provider>
  )
}

function NavItem({ icon: Icon, label, pageId, active = false, hasSubmenu = false, expanded = false, onClick, children }) {
  const { open, setOpen, currentPage, setCurrentPage } = useSidebar()
  const isActive = active || currentPage === pageId

  const handleClick = () => {
    if (pageId) {
      setCurrentPage(pageId)
    }
    if (onClick) {
      onClick()
    }
  }

  const content = (
    <button
      onClick={handleClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive 
          ? "bg-primary text-primary-foreground" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        !open && "justify-center px-2"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {open && (
        <>
          <span className="flex-1 text-left">{label}</span>
          {hasSubmenu && (
            <ChevronDown 
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                expanded && "rotate-180"
              )} 
            />
          )}
        </>
      )}
    </button>
  )

  if (!open) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-4">
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

function NavSection({ title, children }) {
  const { open } = useSidebar()
  
  return (
    <div className="px-3 py-2">
      {open && title && (
        <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      )}
      <div className="space-y-1">
        {children}
      </div>
    </div>
  )
}

function Submenu({ children, expanded }) {
  const { open } = useSidebar()
  
  if (!open) return null
  
  return (
    <Collapsible open={expanded}>
      <CollapsibleContent className="overflow-hidden transition-all">
        <div className="mt-1 space-y-1 pl-9 pr-2">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function SubmenuItem({ label, pageId, active = false }) {
  const { currentPage, setCurrentPage } = useSidebar()
  const isActive = active || currentPage === pageId

  return (
    <button
      onClick={() => setCurrentPage(pageId)}
      className={cn(
        "flex w-full items-center rounded-md px-3 py-1.5 text-sm transition-colors",
        isActive 
          ? "bg-primary/10 text-primary font-medium" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
    </button>
  )
}

export function Sidebar() {
  const { open, setOpen } = useSidebar()
  const [expandedMenus, setExpandedMenus] = useState({
    analytics: true,
    events: false,
    users: false,
    reports: false,
  })

  const toggleMenu = (menu) => {
    setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }))
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-card transition-all duration-300",
          open ? "w-64" : "w-16"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {open ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold">OpenFlow</h1>
                <p className="text-[10px] text-muted-foreground">Analytics</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", !open && "hidden")}
            onClick={() => setOpen(false)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-2">
            {/* Dashboard */}
            <NavSection>
              <NavItem 
                icon={LayoutDashboard} 
                label="Dashboard" 
                pageId="dashboard"
              />
            </NavSection>

            <Separator className="my-2" />

            {/* Analytics Section */}
            <NavSection title="Analytics">
              <Collapsible open={expandedMenus.analytics}>
                <CollapsibleTrigger asChild>
                  <div onClick={() => toggleMenu('analytics')}>
                    <NavItem 
                      icon={BarChart3} 
                      label="Analytics" 
                      pageId="analytics"
                      hasSubmenu
                      expanded={expandedMenus.analytics}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Submenu expanded={true}>
                    <SubmenuItem label="Trends" pageId="trends" />
                    <SubmenuItem label="Funnels" pageId="funnels" />
                    <SubmenuItem label="Retention" pageId="retention" />
                    <SubmenuItem label="Paths" pageId="paths" />
                    <SubmenuItem label="Cohorts" pageId="cohorts" />
                    <SubmenuItem label="Journeys" pageId="journeys" />
                  </Submenu>
                </CollapsibleContent>
              </Collapsible>
            </NavSection>

            {/* Events Section */}
            <NavSection title="Data">
              <Collapsible open={expandedMenus.events}>
                <CollapsibleTrigger asChild>
                  <div onClick={() => toggleMenu('events')}>
                    <NavItem 
                      icon={MousePointerClick} 
                      label="Events" 
                      pageId="events"
                      hasSubmenu
                      expanded={expandedMenus.events}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Submenu expanded={true}>
                    <SubmenuItem label="Event Stream" pageId="event-stream" />
                    <SubmenuItem label="Event Properties" pageId="event-properties" />
                    <SubmenuItem label="Live View" pageId="live-view" />
                  </Submenu>
                </CollapsibleContent>
              </Collapsible>

              <NavItem 
                icon={Route} 
                label="Sessions" 
                pageId="sessions"
              />

              <Collapsible open={expandedMenus.users}>
                <CollapsibleTrigger asChild>
                  <div onClick={() => toggleMenu('users')}>
                    <NavItem 
                      icon={Users} 
                      label="Users" 
                      pageId="users"
                      hasSubmenu
                      expanded={expandedMenus.users}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Submenu expanded={true}>
                    <SubmenuItem label="User Profiles" pageId="user-profiles" />
                    <SubmenuItem label="User Properties" pageId="user-properties" />
                    <SubmenuItem label="Segments" pageId="segments" />
                  </Submenu>
                </CollapsibleContent>
              </Collapsible>
            </NavSection>

            <Separator className="my-2" />

            {/* Reports Section */}
            <NavSection title="Reports">
              <Collapsible open={expandedMenus.reports}>
                <CollapsibleTrigger asChild>
                  <div onClick={() => toggleMenu('reports')}>
                    <NavItem 
                      icon={FileText} 
                      label="Reports" 
                      pageId="reports"
                      hasSubmenu
                      expanded={expandedMenus.reports}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Submenu expanded={true}>
                    <SubmenuItem label="Saved Reports" pageId="saved-reports" />
                    <SubmenuItem label="Scheduled" pageId="scheduled" />
                    <SubmenuItem label="Dashboards" pageId="dashboards" />
                  </Submenu>
                </CollapsibleContent>
              </Collapsible>

              <NavItem 
                icon={Target} 
                label="Goals" 
                pageId="goals"
              />
            </NavSection>

            <Separator className="my-2" />

            {/* Settings */}
            <NavSection title="System">
              <NavItem 
                icon={Settings} 
                label="Settings" 
                pageId="settings"
              />
              <NavItem 
                icon={HelpCircle} 
                label="Help & Support" 
                pageId="help"
              />
            </NavSection>
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-4">
          {open ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  Admin
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Admin User</p>
                <p className="text-xs text-muted-foreground truncate">admin@openflow.io</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full"
                  onClick={() => setOpen(true)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}

export function MainContent({ children }) {
  const { open } = useSidebar()
  
  return (
    <main
      className={cn(
        "min-h-screen bg-background transition-all duration-300",
        open ? "ml-64" : "ml-16"
      )}
    >
      {children}
    </main>
  )
}
