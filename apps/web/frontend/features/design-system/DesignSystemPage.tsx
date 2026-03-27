import { PageTransition } from '@/components/layout/PageTransition'
import { PrimitivesSection } from './components/sections/PrimitivesSection'
import { FeedbackSection } from './components/sections/FeedbackSection'
import { ChartsSection } from './components/sections/ChartsSection'
import { DataSection } from './components/sections/DataSection'
import { AppComponentsSection } from './components/sections/AppComponentsSection'

const NAV_SECTIONS = [
  { id: 'primitives', label: 'UI Primitives' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'charts', label: 'Charts' },
  { id: 'data', label: 'Data Display' },
  { id: 'app', label: 'App Components' },
]

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

export function DesignSystemPage() {
  return (
    <PageTransition>
      <div className="flex gap-8">
        {/* Inner sticky sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-6 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 pb-2">
              Components
            </p>
            {NAV_SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className="w-full text-left text-sm px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-12 pb-16">
          <div>
            <h1 className="text-2xl font-bold">Design System</h1>
            <p className="text-muted-foreground mt-1">
              All UI components rendered in the app theme.
            </p>
          </div>

          <PrimitivesSection />
          <FeedbackSection />
          <ChartsSection />
          <DataSection />
          <AppComponentsSection />
        </div>
      </div>
    </PageTransition>
  )
}
