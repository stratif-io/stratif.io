import { ComponentSection, ComponentRow } from '../ComponentSection'
import { DataTable } from '@/components/data-table'
import { EventsDataTable, generateMockEvents } from '@/components/data-table'
import type { ColumnDef } from '@tanstack/react-table'

interface SampleRow {
  id: string
  name: string
  value: number
  status: string
}

const sampleColumns: ColumnDef<SampleRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'value', header: 'Value' },
  { accessorKey: 'status', header: 'Status' },
]

const sampleRows: SampleRow[] = [
  { id: '1', name: 'page_view', value: 1240, status: 'active' },
  { id: '2', name: 'click', value: 830, status: 'active' },
  { id: '3', name: 'signup', value: 142, status: 'active' },
  { id: '4', name: 'purchase', value: 38, status: 'inactive' },
]

const mockEvents = generateMockEvents(5)

export function DataSection() {
  return (
    <ComponentSection id="data" title="Data Display">
      <ComponentRow label="DataTable">
        <div className="w-full border rounded-md overflow-hidden">
          <DataTable columns={sampleColumns} data={sampleRows} />
        </div>
      </ComponentRow>
      <ComponentRow label="EventsDataTable">
        <div className="w-full border rounded-md overflow-hidden">
          <EventsDataTable events={mockEvents} />
        </div>
      </ComponentRow>
      <ComponentRow label="PivotTable">
        <p className="text-sm text-muted-foreground">Requires live data connection.</p>
      </ComponentRow>
    </ComponentSection>
  )
}
