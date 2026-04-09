import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/api'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/ui/toast-provider'
import { AnalyticsProvider, loggingAdapter } from '@/lib/analytics'
import App from './App'
import './index.css'

const adapter = import.meta.env.VITE_ANALYTICS_DEBUG === 'true' ? loggingAdapter : undefined

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <AnalyticsProvider adapter={adapter}>
            <App />
            <ToastProvider />
          </AnalyticsProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)
