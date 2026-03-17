import { useEffect, useState } from 'react'

/**
 * Returns false for the first `delay` ms even when isLoading is true.
 * Prevents skeleton flash on fast loads (< delay ms).
 *
 * Only pass `isLoading` here — never `isFetching`. Background refetches
 * during stale-while-revalidate intentionally have no visual indicator.
 */
export function useDeferredLoading(isLoading: boolean, delay = 200): boolean {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setShow(false)
      return
    }
    const timer = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(timer)
  }, [isLoading, delay])

  return show
}
