export interface RawEvent {
  event_id: string
  user_id: string
  event_name: string
  timestamp: string
  properties?: Record<string, unknown>
}

export interface FilterField {
  field: string
  label: string
}

export interface CustomProperty {
  name: string
  path: string
}

export interface EventsTableProps {
  data: RawEvent[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  isFetching?: boolean
  sortField: string
  sortOrder: 'asc' | 'desc'
  onSortChange: (field: string, order: 'asc' | 'desc') => void
  filterFields: FilterField[]
  customProperties: CustomProperty[]
  filterOptions: Record<string, string[]> // accepted for API compat; dim cols use click-to-filter
  allEventNames: string[]
  columnFilters: Record<string, string[]>
  onColumnFilterChange: (field: string, values: string[]) => void
  onColumnFilterClear: (field: string) => void
  eventNameFilter: string[]
  onEventNameFilterChange: (v: string[]) => void
  userIdFilter: string
  onUserIdFilterChange: (v: string) => void
  onPageChange: (page: number) => void
  onUserClick: (userId: string) => void
  connectionId?: string | null
  colVisibility?: import('@tanstack/react-table').VisibilityState
  onColumnVisibilityChange?: (v: import('@tanstack/react-table').VisibilityState) => void
}
