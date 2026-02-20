import { Toaster } from 'sonner'
import { useAppStore } from '@/stores/app-store'

/**
 * Toast notification provider using Sonner
 * Automatically adapts to light/dark theme
 */
export function ToastProvider() {
  const theme = useAppStore((state) => state.theme)

  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
        },
        className: 'sonner-toast',
      }}
      richColors
    />
  )
}

// Export toast functions for convenience
export { toast } from 'sonner'
