import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resendVerification } from '@/lib/api/queries'
import { useAuthContext } from '@/contexts/AuthContext'

export function EmailVerificationBanner() {
  const { user } = useAuthContext()
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (!user || user.email_verified || dismissed) return null

  const handleResend = async () => {
    setSending(true)
    try {
      await resendVerification()
      setSent(true)
    } catch {
      // Silently ignore — user can try again
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
      <span>
        Please verify your email address.{' '}
        {sent ? (
          <span className="font-medium">Verification email sent!</span>
        ) : (
          <button
            onClick={handleResend}
            disabled={sending}
            className="font-medium underline underline-offset-2 hover:no-underline disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Resend email'}
          </button>
        )}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-amber-600 hover:text-amber-900"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
