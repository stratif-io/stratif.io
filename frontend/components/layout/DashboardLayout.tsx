import { Outlet } from 'react-router-dom'
import { useAppStore } from '@/stores'
import { useUrlSync } from '@/hooks'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

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
          sidebarOpen ? 'lg:ml-[220px]' : 'lg:ml-[60px]'
        )}
      >
        <Header />
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
    </TooltipProvider>
  )
}
