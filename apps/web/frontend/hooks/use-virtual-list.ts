import { useCallback, useRef, useState } from 'react'
import { useVirtualizer, VirtualItem, Virtualizer } from '@tanstack/react-virtual'

export interface UseVirtualListOptions<T> {
  items: T[]
  estimateSize?: (index: number, item: T) => number
  overscan?: number
}

export interface UseVirtualListReturn<_T> {
  virtualizer: Virtualizer<HTMLDivElement, Element>
  virtualItems: VirtualItem[]
  totalSize: number
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' }) => void
  scrollToOffset: (offset: number, options?: { align?: 'start' | 'center' | 'end' }) => void
  measureElement: (element: Element | null) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function useVirtualList<T>({
  items,
  estimateSize = () => 50,
  overscan = 3,
}: UseVirtualListOptions<T>): UseVirtualListReturn<T> {
  const containerRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => estimateSize(index, items[index]),
    overscan,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  const scrollToIndex = useCallback(
    (index: number, options?: { align?: 'start' | 'center' | 'end' }) => {
      virtualizer.scrollToIndex(index, options)
    },
    [virtualizer]
  )

  const scrollToOffset = useCallback(
    (offset: number, options?: { align?: 'start' | 'center' | 'end' }) => {
      virtualizer.scrollToOffset(offset, options)
    },
    [virtualizer]
  )

  const measureElement = useCallback(
    (element: Element | null) => {
      if (element) {
        virtualizer.measureElement(element)
      }
    },
    [virtualizer]
  )

  return {
    virtualizer,
    virtualItems,
    totalSize,
    scrollToIndex,
    scrollToOffset,
    measureElement,
    containerRef,
  }
}

export interface UseInfiniteScrollOptions<T> {
  items: T[]
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  threshold?: number
  estimateSize?: (index: number, item: T) => number
}

export interface UseInfiniteScrollReturn<T> extends UseVirtualListReturn<T> {
  isFetchingMore: boolean
}

export function useInfiniteScroll<T>({
  items,
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 5,
  estimateSize = () => 50,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => estimateSize(index, items[index]),
    overscan: 5,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading && !isFetchingMore) {
      setIsFetchingMore(true)
      onLoadMore()
    }
  }, [hasMore, isLoading, isFetchingMore, onLoadMore])

  const lastItem = virtualItems[virtualItems.length - 1]
  if (lastItem && lastItem.index >= items.length - threshold && hasMore && !isLoading) {
    handleLoadMore()
  }

  const scrollToIndex = useCallback(
    (index: number, options?: { align?: 'start' | 'center' | 'end' }) => {
      virtualizer.scrollToIndex(index, options)
    },
    [virtualizer]
  )

  const scrollToOffset = useCallback(
    (offset: number, options?: { align?: 'start' | 'center' | 'end' }) => {
      virtualizer.scrollToOffset(offset, options)
    },
    [virtualizer]
  )

  const measureElement = useCallback(
    (element: Element | null) => {
      if (element) {
        virtualizer.measureElement(element)
      }
    },
    [virtualizer]
  )

  return {
    virtualizer,
    virtualItems,
    totalSize,
    scrollToIndex,
    scrollToOffset,
    measureElement,
    containerRef,
    isFetchingMore,
  }
}
