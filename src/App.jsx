import { SidebarProvider, Sidebar, MainContent, useSidebar } from '@/components/layout/Sidebar'
import { DashboardPage } from '@/pages/DashboardPage'
import { TrendsPage, RetentionPage, PathsPage } from '@/pages/AnalyticsPages'
import { 
  FunnelsPage,
  CohortsPage,
  JourneysPage,
  EventStreamPage,
  EventPropertiesPage,
  LiveViewPage,
  SessionsPage,
  UserProfilesPage,
  UserPropertiesPage,
  SegmentsPage,
  SavedReportsPage,
  ScheduledReportsPage,
  DashboardsPage,
  GoalsPage,
  SettingsPage,
  HelpPage
} from '@/pages/PlaceholderPages'

function PageContent() {
  const { currentPage } = useSidebar()

  switch (currentPage) {
    case 'dashboard':
      return <DashboardPage />
    case 'trends':
      return <TrendsPage />
    case 'funnels':
      return <FunnelsPage />
    case 'retention':
      return <RetentionPage />
    case 'paths':
      return <PathsPage />
    case 'cohorts':
      return <CohortsPage />
    case 'journeys':
      return <JourneysPage />
    case 'event-stream':
      return <EventStreamPage />
    case 'event-properties':
      return <EventPropertiesPage />
    case 'live-view':
      return <LiveViewPage />
    case 'sessions':
      return <SessionsPage />
    case 'user-profiles':
      return <UserProfilesPage />
    case 'user-properties':
      return <UserPropertiesPage />
    case 'segments':
      return <SegmentsPage />
    case 'saved-reports':
      return <SavedReportsPage />
    case 'scheduled':
      return <ScheduledReportsPage />
    case 'dashboards':
      return <DashboardsPage />
    case 'goals':
      return <GoalsPage />
    case 'settings':
      return <SettingsPage />
    case 'help':
      return <HelpPage />
    default:
      return <DashboardPage />
  }
}

function App() {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MainContent>
          <PageContent />
        </MainContent>
      </div>
    </SidebarProvider>
  )
}

export default App
