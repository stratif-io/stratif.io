import type { ReactNode } from 'react'
import { ConnectionSidebar } from './ConnectionSidebar'
import type { ConnectionStep, TestStatus } from './ConnectionSidebar'

interface ConnectionSetupLayoutProps {
  connectionName: string
  dbType: string
  testStatus: TestStatus
  currentStep: ConnectionStep
  completedSteps: ConnectionStep[]
  onStepClick: (step: ConnectionStep) => void
  tableFooter?: string
  children: ReactNode
}

export function ConnectionSetupLayout({
  connectionName,
  dbType,
  testStatus,
  currentStep,
  completedSteps,
  onStepClick,
  tableFooter,
  children,
}: ConnectionSetupLayoutProps) {
  return (
    <div className="flex border rounded-lg overflow-hidden flex-1 min-h-0 bg-muted/30">
      <ConnectionSidebar
        connectionName={connectionName}
        dbType={dbType}
        testStatus={testStatus}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={onStepClick}
        tableFooter={tableFooter}
      />
      <div className="flex-1 bg-muted/20 overflow-hidden flex flex-col">{children}</div>
    </div>
  )
}
