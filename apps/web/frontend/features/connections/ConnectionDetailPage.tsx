import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SPACING } from '@/lib/constants'
import { useConnection, useUpsertSchemaConfig } from './hooks/useConnectionsData'
import { ConnectionSetupLayout } from './components/ConnectionSetupLayout'
import { CredentialsStep } from './components/steps/CredentialsStep'
import { TableStep } from './components/steps/TableStep'
import { FieldMapStep } from './components/steps/FieldMapStep'
import { AdvancedStep } from './components/steps/AdvancedStep'
import type { ConnectionStep, TestStatus } from './components/ConnectionSidebar'

// Determine which step to land on when no explicit step is in the URL
function getDefaultStep(connection: {
  schema_config?: { events_table?: string } | null
}): ConnectionStep {
  if (!connection.schema_config) return 'credentials'
  if (!connection.schema_config.events_table) return 'table'
  return 'fieldmap'
}

function getCompletedSteps(
  connection: { schema_config?: { events_table?: string } | null },
  testStatus: TestStatus
): ConnectionStep[] {
  const steps: ConnectionStep[] = []
  if (testStatus === 'connected') steps.push('credentials')
  if (connection.schema_config?.events_table) {
    if (!steps.includes('credentials')) steps.push('credentials')
    steps.push('table')
  }
  return steps
}

export function ConnectionDetailPage() {
  const { id, step: stepParam } = useParams<{ id: string; step?: string }>()
  const navigate = useNavigate()
  const { data: connection, isLoading, error } = useConnection(id ?? '')
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const upsertSchema = useUpsertSchemaConfig(id ?? '')

  if (isLoading) {
    return (
      <div className={SPACING.page}>
        <p className="text-sm text-muted-foreground">Loading connection…</p>
      </div>
    )
  }

  if (error || !connection) {
    return (
      <div className={SPACING.page}>
        <p className="text-sm text-destructive">
          {(error as Error)?.message ?? 'Connection not found'}
        </p>
        <Button variant="link" className="px-0 mt-2" onClick={() => navigate('/connections')}>
          Back to Connections
        </Button>
      </div>
    )
  }

  const conn = connection as typeof connection & {
    schema_config?: { events_table?: string } | null
  }
  const defaultStep = getDefaultStep(conn)
  const validSteps: ConnectionStep[] = ['credentials', 'table', 'fieldmap', 'advanced']
  const currentStep: ConnectionStep = validSteps.includes(stepParam as ConnectionStep)
    ? (stepParam as ConnectionStep)
    : defaultStep

  const completedSteps = getCompletedSteps(conn, testStatus)

  const handleStepClick = (step: ConnectionStep) => {
    navigate(`/connections/${id}/${step}`)
  }

  const handleTestStatusChange = (status: TestStatus) => {
    setTestStatus(status)
  }

  const handleTableConfirm = (tableName: string) => {
    upsertSchema.mutate({ events_table: tableName } as never, {
      onSuccess: () => navigate(`/connections/${id}/fieldmap`),
    })
  }

  const tableFooter =
    currentStep === 'fieldmap' || currentStep === 'advanced'
      ? (conn.schema_config?.events_table ?? undefined)
      : undefined

  return (
    <div className={SPACING.page}>
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          onClick={() => navigate('/connections')}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Connections
        </Button>
      </div>

      <ConnectionSetupLayout
        connectionName={connection.name}
        dbType={connection.db_type}
        testStatus={testStatus}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
        tableFooter={tableFooter}
      >
        {currentStep === 'credentials' && (
          <CredentialsStep
            connection={connection}
            onTestStatusChange={handleTestStatusChange}
            onNext={() => navigate(`/connections/${id}/table`)}
          />
        )}
        {currentStep === 'table' && (
          <TableStep
            connId={connection.id}
            currentTable={conn.schema_config?.events_table ?? ''}
            onConfirm={handleTableConfirm}
          />
        )}
        {currentStep === 'fieldmap' && <FieldMapStep connId={connection.id} />}
        {currentStep === 'advanced' && (
          <AdvancedStep connId={connection.id} onDone={() => navigate('/connections')} />
        )}
      </ConnectionSetupLayout>
    </div>
  )
}
