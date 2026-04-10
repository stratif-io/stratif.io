import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-50 px-4">
      {/* Bar chart illustration */}
      <div className="rounded-xl bg-indigo-50 p-6">
        <svg width="120" height="60" viewBox="0 0 120 60" aria-hidden="true">
          <rect x="10" y="40" width="12" height="14" rx="2" fill="#c7c7f0" />
          <rect x="28" y="28" width="12" height="26" rx="2" fill="#a5a5e8" />
          <rect x="46" y="18" width="12" height="36" rx="2" fill="#8383e0" />
          <rect x="64" y="32" width="12" height="22" rx="2" fill="#a5a5e8" />
          <rect x="82" y="10" width="12" height="44" rx="2" fill="#6366f1" />
          <rect x="100" y="22" width="12" height="32" rx="2" fill="#8383e0" />
          <text
            x="60"
            y="58"
            textAnchor="middle"
            fill="#9999cc"
            fontSize="7"
            fontFamily="monospace"
          >
            no data found
          </text>
        </svg>
      </div>

      {/* Copy */}
      <div className="text-center">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Error 404
        </p>
        <h1 className="mb-3 text-2xl font-bold text-gray-900">Nothing to chart here</h1>
        <p className="text-sm leading-relaxed text-gray-500">
          This page has zero data points — because it doesn&apos;t exist.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex gap-3">
        <Link
          to="/dashboard"
          className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Back to Dashboard
        </Link>
        <a
          href="https://github.com/cabichahine/stratif.io"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
        >
          View Docs
        </a>
      </div>
    </div>
  )
}
