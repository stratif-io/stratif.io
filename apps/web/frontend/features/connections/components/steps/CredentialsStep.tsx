import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { SaveStatus } from '@/components/ui/save-status'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import {
  useTestConnection,
  useUpdateConnection,
  useConnectionCredentials,
} from '../../hooks/useConnectionsData'
import type { Connection } from '@/types'
import type { TestStatus } from '../ConnectionSidebar'
import { CredentialFields, buildCredentials } from '../ConnectionConfigTab'

interface Props {
  connection: Connection
  onTestStatusChange: (status: TestStatus) => void
  onNext: () => void
}

export function CredentialsStep({ connection, onTestStatusChange, onNext }: Props) {
  const test = useTestConnection()
  const update = useUpdateConnection(connection.id)
  const { data: credsData } = useConnectionCredentials(connection.id)
  const formRef = useRef<HTMLFormElement>(null)
  const credsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fields = credsData?.fields ?? {}

  // Derive test status
  const testStatus: TestStatus = test.isPending
    ? 'testing'
    : test.data?.ok === true
      ? 'connected'
      : test.data?.ok === false || test.error
        ? 'failed'
        : 'idle'

  // Auto-test on mount
  useEffect(() => {
    test.mutate(connection.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.id])

  // Emit status changes to parent
  useEffect(() => {
    onTestStatusChange(testStatus)
  }, [testStatus, onTestStatusChange])

  function saveCredentials() {
    if (!formRef.current) return
    const credentials = buildCredentials(connection.db_type, formRef.current)
    const changedCredentials = Object.fromEntries(
      Object.entries(credentials).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    )
    if (Object.keys(changedCredentials).length > 0) {
      update.mutate({ credentials: changedCredentials })
    }
  }

  function handleFormInput() {
    if (credsTimer.current) clearTimeout(credsTimer.current)
    test.reset()
    credsTimer.current = setTimeout(saveCredentials, 1000)
  }

  function handleRetest() {
    test.mutate(connection.id)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Test state banner */}
      <div
        data-testid="credentials-test-state"
        className={
          testStatus === 'testing'
            ? 'flex items-center gap-2 px-4 py-3 text-sm text-blue-700 bg-blue-50 border-b'
            : testStatus === 'connected'
              ? 'flex items-center gap-2 px-4 py-3 text-sm text-green-700 bg-green-50 border-b'
              : testStatus === 'failed'
                ? 'flex items-center gap-2 px-4 py-3 text-sm text-red-700 bg-red-50 border-b'
                : 'flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground bg-muted/30 border-b'
        }
      >
        {testStatus === 'testing' && <Loader2 className="h-4 w-4 animate-spin" />}
        {testStatus === 'connected' && <CheckCircle className="h-4 w-4" />}
        {testStatus === 'failed' && <XCircle className="h-4 w-4" />}
        <span>
          {testStatus === 'testing' && 'Testing connection…'}
          {testStatus === 'connected' &&
            `Connected${test.data?.db_type ? ` (${test.data.db_type})` : ''}`}
          {testStatus === 'failed' && 'Connection failed'}
          {testStatus === 'idle' && 'Not tested'}
        </span>
      </div>

      {/* Credential fields */}
      <div className="flex-1 overflow-auto p-4">
        <form ref={formRef} onInput={handleFormInput} className="space-y-3">
          <CredentialFields
            dbType={connection.db_type}
            fields={fields}
            onCheckboxChange={saveCredentials}
          />
        </form>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t">
        <SaveStatus
          status={
            update.isPending
              ? 'saving'
              : update.isSuccess
                ? 'saved'
                : update.isError
                  ? 'error'
                  : 'idle'
          }
          onRetry={saveCredentials}
        />
        <div className="flex items-center gap-2">
          {testStatus === 'failed' && (
            <Button type="button" variant="outline" size="sm" onClick={handleRetest}>
              Re-test
            </Button>
          )}
          <Button type="button" size="sm" disabled={testStatus !== 'connected'} onClick={onNext}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
