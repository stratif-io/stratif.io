import { useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface VirtualListProps<T> {
  items: T[]
  renderItem: (item: T, index: number, virtualItem: VirtualItem) => React.ReactNode
  estimateSize?: (index: number, item: T) => number
  overscan?: number
  className?: string
  style?: React.CSSProperties
  loading?: boolean
  loadingComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
  emptyMessage?: string
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void
  stickyIndices?: number[]
  getItemKey?: (index: number, item: T) => string | number
  onEndReached?: () => void
  endReachedThreshold?: number
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  loaderComponent?: React.ReactNode
}

export interface VirtualListRef {
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' }) => void
  scrollToOffset: (offset: number, options?: { align?: 'start' | 'center' | 'end' }) => void
  measure: () => void
}

function VirtualListInner<T>(props: VirtualListProps<T>, ref: React.ForwardedRef<VirtualListRef>) {
  const {
    items,
    renderItem,
    estimateSize = () => 50,
    overscan = 5,
    className,
    style,
    loading = false,
    loadingComponent,
    emptyComponent,
    emptyMessage = 'No items',
    onScroll,
    stickyIndices = [],
    getItemKey,
    onEndReached,
    endReachedThreshold = 0.8,
    hasNextPage = false,
    isFetchingNextPage = false,
    loaderComponent,
  } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const scrollOffsetRef = useRef(0)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => estimateSize(index, items[index]),
    overscan,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  useImperativeHandle(ref, () => ({
    scrollToIndex: (index, options) => virtualizer.scrollToIndex(index, options),
    scrollToOffset: (offset, options) => virtualizer.scrollToOffset(offset, options),
    measure: () => virtualizer.measure(),
  }))

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      scrollOffsetRef.current = event.currentTarget.scrollTop

      if (onEndReached && hasNextPage && !isFetchingNextPage) {
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight

        if (scrollPercentage >= endReachedThreshold) {
          onEndReached()
        }
      }

      onScroll?.(event)
    },
    [onScroll, onEndReached, hasNextPage, isFetchingNextPage, endReachedThreshold]
  )

  const measureElement = useCallback(
    (element: Element | null, index: number) => {
      if (element) {
        virtualizer.measureElement(element)
      }
    },
    [virtualizer]
  )

  if (loading && items.length === 0) {
    return (
      <div className={cn('relative overflow-auto', className)} style={style}>
        {loadingComponent || (
          <div className="space-y-2 p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!loading && items.length === 0) {
    return (
      <div className={cn('relative overflow-auto', className)} style={style}>
        {emptyComponent || (
          <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={style}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: `${totalSize}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index]
          const isSticky = stickyIndices.includes(virtualItem.index)
          const key = getItemKey ? getItemKey(virtualItem.index, item) : virtualItem.key

          return (
            <div
              key={key}
              data-index={virtualItem.index}
              ref={(el) => measureElement(el, virtualItem.index)}
              className={cn(isSticky && 'sticky top-0 z-10 bg-background')}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, virtualItem.index, virtualItem)}
            </div>
          )
        })}
      </div>

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          {loaderComponent || (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Loading more...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: React.ForwardedRef<VirtualListRef> }
) => React.ReactElement

export interface VirtualGridProps<T> extends Omit<VirtualListProps<T>, 'renderItem'> {
  renderItem: (item: T, index: number, virtualItem: VirtualItem) => React.ReactNode
  columnCount?: number
  gap?: number
}

export function VirtualGrid<T>({
  items,
  renderItem,
  estimateSize = () => 200,
  columnCount = 3,
  gap = 16,
  className,
  style,
  loading = false,
  emptyMessage = 'No items',
  ...props
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)

  const rowCount = Math.ceil(items.length / columnCount)

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => estimateSize(0, items[0]) + gap,
    overscan: 3,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()

  if (loading && items.length === 0) {
    return (
      <div className={cn('relative overflow-auto', className)} style={style}>
        <div
          className="grid gap-4 p-4"
          style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
        >
          {Array.from({ length: columnCount * 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  if (!loading && items.length === 0) {
    return (
      <div className={cn('relative overflow-auto', className)} style={style}>
        <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
          {emptyMessage}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn('relative overflow-auto', className)} style={style}>
      <div
        style={{
          height: `${totalSize}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount
          const rowItems = items.slice(startIndex, startIndex + columnCount)

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                gap: `${gap}px`,
                padding: `0 ${gap}px`,
              }}
            >
              {rowItems.map((item, columnIndex) => {
                const index = startIndex + columnIndex
                return <div key={index}>{renderItem(item, index, virtualRow)}</div>
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
