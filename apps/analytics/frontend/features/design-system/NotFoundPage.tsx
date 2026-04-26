import { Link } from 'react-router-dom'
import { TYPOGRAPHY } from '@/lib/constants'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4">
      {/* Bar chart illustration */}
      <div className="rounded-xl bg-primary/5 p-6">
        <svg width="120" height="60" viewBox="0 0 120 60" aria-hidden="true">
          <rect x="10" y="40" width="12" height="14" rx="2" className="fill-muted-foreground/30" />
          <rect x="28" y="28" width="12" height="26" rx="2" className="fill-muted-foreground/45" />
          <rect x="46" y="18" width="12" height="36" rx="2" className="fill-muted-foreground/60" />
          <rect x="64" y="32" width="12" height="22" rx="2" className="fill-muted-foreground/45" />
          <rect x="82" y="10" width="12" height="44" rx="2" className="fill-primary" />
          <rect x="100" y="22" width="12" height="32" rx="2" className="fill-muted-foreground/60" />
          <text
            x="60"
            y="58"
            textAnchor="middle"
            fontSize="7"
            fontFamily="monospace"
            className="fill-muted-foreground"
          >
            no data found
          </text>
        </svg>
      </div>

      {/* Copy */}
      <div className="text-center">
        <p className={`${TYPOGRAPHY.labelSm} uppercase tracking-widest text-muted-foreground mb-1`}>
          Error 404
        </p>
        <h1 className="mb-3 text-2xl font-bold text-foreground">Nothing to chart here</h1>
        <p className={`${TYPOGRAPHY.muted} leading-relaxed`}>
          This page has zero data points — because it doesn&apos;t exist.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex gap-3">
        <Link
          to="/dashboard"
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Back to Dashboard
        </Link>
        <a
          href="https://github.com/cabichahine/stratif.io"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:border-border/80 hover:text-foreground"
        >
          View Docs
        </a>
      </div>
    </div>
  )
}
