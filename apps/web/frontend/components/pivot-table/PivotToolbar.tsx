import { RotateCcw, Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface PivotToolbarProps {
  isQuerying: boolean
  onReset: () => void
  onExportCsv: () => void
  onAddFilter: () => void
}

export function PivotToolbar({ isQuerying, onReset, onExportCsv, onAddFilter }: PivotToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background">
      <span className="text-sm font-medium mr-auto">Pivot</span>
      {isQuerying && <Spinner className="h-4 w-4 text-muted-foreground" />}
      <Button variant="ghost" size="sm" onClick={onAddFilter} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Filter
      </Button>
      <Button variant="ghost" size="sm" onClick={onExportCsv} className="gap-1.5">
        <Download className="h-3.5 w-3.5" />
        CSV
      </Button>
      <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5">
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </Button>
    </div>
  )
}
