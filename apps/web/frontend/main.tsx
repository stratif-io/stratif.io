import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/api'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/ui/toast-provider'
import { AnalyticsProvider } from '@/lib/analytics'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <AnalyticsProvider>
            <App />
            <ToastProvider />
          </AnalyticsProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)
