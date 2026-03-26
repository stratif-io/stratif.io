import { Outlet } from 'react-router-dom'
import { useAppStore } from '@/stores'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useUrlSync } from '@/hooks'

export function DashboardLayout() {
  useUrlSync()
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)

  return (
    <TooltipProvider delayDuration={300}>
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          'flex-1 transition-[margin] duration-300 ease-in-out',
          sidebarOpen ? 'lg:ml-[var(--sidebar-expanded)]' : 'lg:ml-[var(--sidebar-collapsed)]'
        )}
      >
        <Header />
        <main id="main-content" className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[var(--content-max-width)]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
    </TooltipProvider>
  )
}
