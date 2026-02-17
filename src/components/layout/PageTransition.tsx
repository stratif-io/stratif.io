import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Wrapper component for page-level fade-in animations
 */
export function PageTransition({ children }: PageTransitionProps) {
  return (
    <div className="animate-in fade-in-0 duration-300">
      {children}
    </div>
  );
}
