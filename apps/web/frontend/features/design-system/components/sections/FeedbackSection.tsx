import { ComponentSection, ComponentRow } from '../ComponentSection'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { QueryError } from '@/components/ui/query-error'
import { CardLoadingBar } from '@/components/ui/card-loading-bar'
import { UnderConstruction } from '@/components/UnderConstruction'
import { NoConnectionScreen } from '@/components/ui/no-connection-guard'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast-provider'

const stubError = new Error('Failed to load data.')

export function FeedbackSection() {
  return (
    <ComponentSection id="feedback" title="Feedback States">
      <ComponentRow label="LoadingState">
        <div className="border rounded-md w-64 h-32 relative overflow-hidden flex items-center justify-center">
          <LoadingState message="Loading data..." size="sm" />
        </div>
      </ComponentRow>

      <ComponentRow label="EmptyState">
        <div className="border rounded-md w-64">
          <EmptyState title="No data" description="Nothing to display yet." />
        </div>
      </ComponentRow>

      <ComponentRow label="QueryError">
        <div className="border rounded-md w-64">
          <QueryError error={stubError} />
        </div>
      </ComponentRow>

      <ComponentRow label="CardLoadingBar">
        <div className="border rounded-md w-64 p-4 relative overflow-hidden">
          <p className="text-sm">Card with loading bar</p>
          <CardLoadingBar loading />
        </div>
      </ComponentRow>

      <ComponentRow label="UnderConstruction">
        <div className="border rounded-md w-64 overflow-hidden">
          <UnderConstruction title="Coming soon" description="This feature isn't ready yet." />
        </div>
      </ComponentRow>

      <ComponentRow label="NoConnectionScreen">
        <div className="border rounded-md w-full overflow-hidden max-w-xl max-h-72 overflow-y-auto">
          <NoConnectionScreen />
        </div>
      </ComponentRow>

      <ComponentRow label="Toast">
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => toast('Event saved')}>
            Default
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.success('Connection added')}>
            Success
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.error('Failed to run query')}>
            Error
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.warning('Query took longer than expected')}
          >
            Warning
          </Button>
        </div>
      </ComponentRow>
    </ComponentSection>
  )
}
