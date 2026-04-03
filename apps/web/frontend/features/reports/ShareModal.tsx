import * as React from 'react'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useCreateReport } from '@/lib/api/reports'

export interface ShareModalProps {
  open: boolean
  onClose: () => void
  page: string
  pageLabel: string
  params: Record<string, unknown>
}

function defaultReportName(pageLabel: string): string {
  return `${pageLabel} — ${format(new Date(), 'MMMM yyyy')}`
}

export function ShareModal({ open, onClose, page, pageLabel, params }: ShareModalProps) {
  const [name, setName] = React.useState(() => defaultReportName(pageLabel))
  const [access, setAccess] = React.useState<'public' | 'authenticated'>('public')
  const [dataMode, setDataMode] = React.useState<'snapshot' | 'live'>('snapshot')
  const [shortcode, setShortcode] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  const { mutateAsync, isPending } = useCreateReport()

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setName(defaultReportName(pageLabel))
      setAccess('public')
      setDataMode('snapshot')
      setShortcode(null)
      setCopied(false)
    }
  }, [open, pageLabel])

  async function handleCreate() {
    const result = await mutateAsync({
      name,
      page,
      params,
      access,
      snapshot: dataMode === 'snapshot',
    })
    setShortcode(result.shortcode)
  }

  async function handleCopy() {
    const url = `${window.location.origin}/r/${shortcode}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const reportUrl = shortcode ? `${window.location.origin}/r/${shortcode}` : null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share report</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Report name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-name" className="text-sm font-medium">
              Report name
            </label>
            <Input
              id="report-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!!shortcode}
            />
          </div>

          {/* Access */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Access</span>
            <div className="flex flex-col gap-2">
              {(
                [
                  {
                    value: 'public',
                    label: 'Anyone on this instance',
                    sub: 'No login needed — anyone with the link can view',
                  },
                  {
                    value: 'authenticated',
                    label: 'Logged-in users only',
                    sub: 'Recipients must have an account',
                  },
                ] as const
              ).map(({ value, label, sub }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={access === value}
                  disabled={!!shortcode}
                  onClick={() => setAccess(value)}
                  className={cn(
                    'flex flex-col items-start gap-0.5 rounded-md border px-3 py-2.5 text-left text-sm transition-colors',
                    access === value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Data mode */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Data</span>
            <div className="flex gap-2">
              {(['snapshot', 'live'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={!!shortcode}
                  onClick={() => setDataMode(mode)}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                    dataMode === mode
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  {mode === 'snapshot' ? 'Snapshot' : 'Live'}
                </button>
              ))}
            </div>
          </div>

          {/* Generated link */}
          {reportUrl && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
              <span className="flex-1 truncate font-mono text-xs">{reportUrl}</span>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          )}

          {/* Action buttons */}
          {!shortcode ? (
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isPending || !name.trim()}>
                {isPending ? 'Creating…' : 'Create report'}
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={onClose}>
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
