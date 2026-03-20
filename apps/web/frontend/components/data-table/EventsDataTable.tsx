import { useMemo } from 'react'
import { ColumnDef, Row } from '@tanstack/react-table'
import { ArrowUpDown, Calendar, User, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { DataTable } from './DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDataTable } from '@/hooks/use-data-table'

export interface Event {
  id: string
  name: string
  description: string
  startDate: Date
  endDate: Date
  location: string
  organizer: string
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  attendees: number
  maxAttendees: number
  category: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

interface EventsDataTableProps {
  events: Event[]
  isLoading?: boolean
  onEventView?: (event: Event) => void
  onEventEdit?: (event: Event) => void
  onEventDelete?: (event: Event) => void
  onEventCopy?: (event: Event) => void
  onEventClick?: (event: Event) => void
  showToolbar?: boolean
}

const statusVariants: Record<Event['status'], 'default' | 'secondary' | 'destructive' | 'outline'> =
  {
    upcoming: 'default',
    ongoing: 'default',
    completed: 'secondary',
    cancelled: 'destructive',
  }

export function EventsDataTable({
  events,
  isLoading = false,
  onEventView,
  onEventEdit,
  onEventDelete,
  onEventCopy,
  onEventClick,
  showToolbar = true,
}: EventsDataTableProps) {
  const {
    sorting,
    setSorting,
    columnVisibility,
    setColumnVisibility,
    rowSelection,
    setRowSelection,
    pagination,
    setPagination,
    globalFilter,
    setGlobalFilter,
  } = useDataTable({ initialPageSize: 10 })

  const columns: ColumnDef<Event, unknown>[] = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Event Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.getValue('name')}</span>
            <span className="text-xs text-muted-foreground line-clamp-1">
              {row.original.description}
            </span>
          </div>
        ),
        meta: {
          displayName: 'Event Name',
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const status = row.getValue('status') as Event['status']
          return (
            <Badge variant={statusVariants[status]} className="capitalize">
              {status}
            </Badge>
          )
        },
        meta: {
          displayName: 'Status',
          filterVariant: 'select',
          filterOptions: [
            { label: 'Upcoming', value: 'upcoming' },
            { label: 'Ongoing', value: 'ongoing' },
            { label: 'Completed', value: 'completed' },
            { label: 'Cancelled', value: 'cancelled' },
          ],
        },
      },
      {
        id: 'startDate',
        accessorKey: 'startDate',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Start Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const date = row.getValue('startDate') as Date
          return format(new Date(date), 'MMM d, yyyy')
        },
        meta: {
          displayName: 'Start Date',
          filterVariant: 'date',
        },
      },
      {
        id: 'endDate',
        accessorKey: 'endDate',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            End Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const date = row.getValue('endDate') as Date
          return format(new Date(date), 'MMM d, yyyy')
        },
        meta: {
          displayName: 'End Date',
        },
      },
      {
        id: 'location',
        accessorKey: 'location',
        header: () => (
          <div className="flex items-center">
            <MapPin className="mr-2 h-4 w-4" />
            Location
          </div>
        ),
        cell: ({ row }) => row.getValue('location'),
        meta: {
          displayName: 'Location',
        },
      },
      {
        id: 'organizer',
        accessorKey: 'organizer',
        header: () => (
          <div className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            Organizer
          </div>
        ),
        cell: ({ row }) => row.getValue('organizer'),
        meta: {
          displayName: 'Organizer',
        },
      },
      {
        id: 'attendees',
        accessorKey: 'attendees',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Attendees
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const attendees = row.getValue('attendees') as number
          const maxAttendees = row.original.maxAttendees
          return (
            <div className="flex flex-col">
              <span className="font-medium">
                {attendees} / {maxAttendees}
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round((attendees / maxAttendees) * 100)}% capacity
              </span>
            </div>
          )
        },
        meta: {
          displayName: 'Attendees',
        },
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Category
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize">
            {row.getValue('category')}
          </Badge>
        ),
        meta: {
          displayName: 'Category',
        },
      },
      {
        id: 'tags',
        accessorKey: 'tags',
        header: 'Tags',
        cell: ({ row }) => {
          const tags = row.getValue('tags') as string[]
          return (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )
        },
        enableSorting: false,
        meta: {
          displayName: 'Tags',
        },
      },
    ],
    []
  )

  const handleRowView = (row: Row<Event>) => onEventView?.(row.original)
  const handleRowEdit = (row: Row<Event>) => onEventEdit?.(row.original)
  const handleRowDelete = (row: Row<Event>) => onEventDelete?.(row.original)
  const handleRowCopy = (row: Row<Event>) => onEventCopy?.(row.original)
  const handleRowClick = (row: Row<Event>) => onEventClick?.(row.original)

  return (
    <DataTable
      columns={columns}
      data={events}
      isLoading={isLoading}
      searchPlaceholder="Search events..."
      showSearch={showToolbar}
      showColumnVisibility={showToolbar}
      showRowSelection
      showRowActions
      onRowView={handleRowView}
      onRowEdit={handleRowEdit}
      onRowDelete={handleRowDelete}
      onRowCopy={handleRowCopy}
      onRowClick={handleRowClick}
      getRowId={(row) => row.id}
      state={{
        sorting,
        columnVisibility,
        rowSelection,
        pagination,
        globalFilter,
      }}
      onSortingChange={setSorting}
      onColumnVisibilityChange={setColumnVisibility}
      onRowSelectionChange={setRowSelection}
      onPaginationChange={setPagination}
      onGlobalFilterChange={setGlobalFilter}
      emptyMessage="No events found."
    />
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function generateMockEvents(count: number = 50): Event[] {
  const statuses: Event['status'][] = ['upcoming', 'ongoing', 'completed', 'cancelled']
  const categories = ['Conference', 'Workshop', 'Meetup', 'Webinar', 'Training', 'Networking']
  const locations = [
    'San Francisco, CA',
    'New York, NY',
    'Austin, TX',
    'Seattle, WA',
    'Denver, CO',
    'Virtual',
  ]
  const organizers = [
    'Tech Community',
    'DevOps Days',
    'Cloud Summit',
    'AI Alliance',
    'Data Science Hub',
    'Startup Hub',
  ]
  const tagOptions = [
    'tech',
    'networking',
    'workshop',
    'cloud',
    'devops',
    'ai',
    'ml',
    'data',
    'security',
    'frontend',
    'backend',
    'fullstack',
  ]

  return Array.from({ length: count }, (_, i) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 60) - 15)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 3) + 1)

    return {
      id: `event-${i + 1}`,
      name: `${['Annual', 'Global', 'Regional', 'Local', ''][Math.floor(Math.random() * 5)]} ${
        categories[Math.floor(Math.random() * categories.length)]
      } ${2024 + Math.floor(Math.random() * 2)}`.trim(),
      description: `Join us for an exciting event featuring industry leaders and hands-on workshops.`,
      startDate,
      endDate,
      location: locations[Math.floor(Math.random() * locations.length)],
      organizer: organizers[Math.floor(Math.random() * organizers.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      attendees: Math.floor(Math.random() * 200),
      maxAttendees: Math.floor(Math.random() * 200) + 100,
      category: categories[Math.floor(Math.random() * categories.length)],
      tags: Array.from(
        { length: Math.floor(Math.random() * 4) + 1 },
        () => tagOptions[Math.floor(Math.random() * tagOptions.length)]
      ).filter((v, i, a) => a.indexOf(v) === i),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  })
}
