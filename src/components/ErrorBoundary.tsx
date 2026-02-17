import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Copy } from 'lucide-react'
import { toast } from '@/components/ui/toast-provider'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorId?: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    return { hasError: true, error, errorId }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', {
      error,
      errorInfo,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined })
    window.location.reload()
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined })
    window.location.href = '/'
  }

  handleCopyError = () => {
    const errorDetails = `Error ID: ${this.state.errorId}
Error: ${this.state.error?.message}
Stack: ${this.state.error?.stack}`

    navigator.clipboard.writeText(errorDetails)
    toast.success('Error details copied to clipboard')
  }

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV

      return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
          <Card className="w-full max-w-lg shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-destructive/20 to-destructive/5 ring-4 ring-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Something went wrong</CardTitle>
              <CardDescription>
                We're sorry, but something unexpected happened. Please try one of the options below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error ID for tracking */}
              <div className="rounded-md bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Error ID</p>
                <code className="text-sm font-mono">{this.state.errorId}</code>
              </div>

              {/* Error message (only in dev) */}
              {isDev && this.state.error && (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                  <p className="text-xs font-semibold text-destructive mb-1">Development Details:</p>
                  <p className="text-xs font-mono text-destructive/90">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                <Button onClick={this.handleReset} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
                <Button onClick={this.handleCopyError} variant="ghost" size="sm" className="w-full">
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copy Error Details
                </Button>
              </div>

              {/* Help text */}
              <p className="text-xs text-center text-muted-foreground mt-4">
                If this problem persists, please contact support with the error ID above.
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
