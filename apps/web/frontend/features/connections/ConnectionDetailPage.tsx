import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SPACING } from '@/lib/constants'
import {
  useConnection,
  useSchemaConfig,
  useUpsertSchemaConfig,
  useTestConnection,
} from './hooks/useConnectionsData'
import type { SchemaConfigBody } from '@/types'
import { ConnectionSetupLayout } from './components/ConnectionSetupLayout'
import { CredentialsStep } from './components/steps/CredentialsStep'
import { TableStep } from './components/steps/TableStep'
import { FieldMapStep } from './components/steps/FieldMapStep'
import { AdvancedStep } from './components/steps/AdvancedStep'
import type { ConnectionStep, TestStatus } from './components/ConnectionSidebar'

function getDefaultStep(
  schemaConfig: { events_table?: string } | null | undefined
): ConnectionStep {
  if (!schemaConfig) return 'credentials'
  if (!schemaConfig.events_table) return 'table'
  return 'fieldmap'
}

function getCompletedSteps(
  schemaConfig: { events_table?: string } | null | undefined,
  testStatus: TestStatus
): ConnectionStep[] {
  const steps: ConnectionStep[] = []
  if (testStatus === 'connected') steps.push('credentials')
  if (schemaConfig?.events_table) {
    if (!steps.includes('credentials')) steps.push('credentials')
    steps.push('table')
  }
  return steps
}

export function ConnectionDetailPage() {
  const { id, tab: stepParam } = useParams<{ id: string; tab?: string }>()
  const navigate = useNavigate()
  const { data: connection, isLoading, error } = useConnection(id ?? '')
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const backgroundTest = useTestConnection()
  const upsertSchema = useUpsertSchemaConfig(id ?? '')
  const { data: schemaConfig } = useSchemaConfig(id ?? '')
  const qc = useQueryClient()

  // When arriving at a non-credentials step (e.g. navigated here after creation),
  // run a background test once to populate the sidebar status badge.
  useEffect(() => {
    if (!id || !connection) return
    const validSteps: ConnectionStep[] = ['credentials', 'table', 'fieldmap', 'advanced']
    const step = validSteps.includes(stepParam as ConnectionStep)
      ? (stepParam as ConnectionStep)
      : getDefaultStep(schemaConfig)
    if (step !== 'credentials') {
      setTestStatus('testing')
      backgroundTest.mutate(id, {
        onSuccess: (result) => setTestStatus(result.ok ? 'connected' : 'failed'),
        onError: () => setTestStatus('failed'),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, !!connection])

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
          {error instanceof Error ? error.message : 'Connection not found'}
        </p>
        <Button variant="link" className="px-0 mt-2" onClick={() => navigate('/connections')}>
          Back to Connections
        </Button>
      </div>
    )
  }

  const defaultStep = getDefaultStep(schemaConfig)
  const validSteps: ConnectionStep[] = ['credentials', 'table', 'fieldmap', 'advanced']
  const currentStep: ConnectionStep = validSteps.includes(stepParam as ConnectionStep)
    ? (stepParam as ConnectionStep)
    : defaultStep

  const completedSteps = getCompletedSteps(schemaConfig, testStatus)

  const handleStepClick = (step: ConnectionStep) => {
    navigate(`/connections/${id}/${step}`)
  }

  const handleTestStatusChange = (status: TestStatus) => {
    setTestStatus(status)
  }

  const handleTableConfirm = (tableName: string) => {
    const payload: SchemaConfigBody = {
      user_id_field: schemaConfig?.user_id_field ?? '',
      event_name_field: schemaConfig?.event_name_field ?? '',
      timestamp_field: schemaConfig?.timestamp_field ?? '',
      events_table: tableName,
      session_timeout_minutes: schemaConfig?.session_timeout_minutes ?? 30,
      resurrection_window_days: schemaConfig?.resurrection_window_days ?? 30,
      power_user_threshold_days: schemaConfig?.power_user_threshold_days ?? 4,
      custom_properties: schemaConfig?.custom_properties ?? [],
      email_field: schemaConfig?.email_field ?? null,
      first_name_field: schemaConfig?.first_name_field ?? null,
      last_name_field: schemaConfig?.last_name_field ?? null,
      date_of_birth_field: schemaConfig?.date_of_birth_field ?? null,
      phone_field: schemaConfig?.phone_field ?? null,
    }
    upsertSchema.mutate(payload, {
      onSuccess: (saved) => {
        // Update the cache immediately so FieldMapStep sees the correct events_table
        // on mount and doesn't overwrite it with the stale value via auto-save.
        qc.setQueryData(['connections', id, 'schema'], saved)
        navigate(`/connections/${id}/fieldmap`)
      },
    })
  }

  const tableFooter =
    currentStep === 'fieldmap' || currentStep === 'advanced'
      ? (schemaConfig?.events_table ?? undefined)
      : undefined

  return (
    <div className="flex flex-col h-full p-4 sm:p-6">
      <div className="mb-4 shrink-0">
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
            currentTable={schemaConfig?.events_table ?? ''}
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
