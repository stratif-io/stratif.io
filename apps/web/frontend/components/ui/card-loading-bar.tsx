import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks'

/**
 * A thin indeterminate progress bar that sits at the top of a card while
 * data is loading. The parent card must have `relative overflow-hidden`.
 */
export function CardLoadingBar({ loading }: { loading?: boolean }) {
  const prefersReducedMotion = useReducedMotion()

  if (!loading) return null

  if (prefersReducedMotion) {
    return <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/50" />
  }

  return (
    <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
      <motion.div
        className="absolute h-full bg-primary/60"
        style={{ width: '45%' }}
        animate={{ left: ['-45%', '100%'] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
