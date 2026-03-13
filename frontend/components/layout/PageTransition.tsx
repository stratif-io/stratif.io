import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

/**
 * Wrapper component for page-level fade-in animations
 */
export function PageTransition({ children }: PageTransitionProps) {
  return <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">{children}</div>
}
