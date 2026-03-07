import { Outlet } from 'react-router-dom'
import { useAppStore } from '@/stores'
import { useUrlSync } from '@/hooks'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { EmailVerificationBanner } from './EmailVerificationBanner'
import { cn } from '@/lib/utils'

export function DashboardLayout() {
  useUrlSync()
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          'flex-1 transition-all duration-300 ease-in-out',
          sidebarOpen ? 'lg:ml-[220px]' : 'lg:ml-[60px]'
        )}
      >
        <EmailVerificationBanner />
        <Header />
        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
