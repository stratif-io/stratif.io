import { useState } from 'react'
import { AuthCard } from './components/AuthCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ForgotPasswordSchema } from '@/lib/schemas/auth-schemas'
import { forgotPassword } from '@/lib/api/queries'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = ForgotPasswordSchema.safeParse({ email })
    if (!result.success) {
      setError(result.error.errors[0].message)
      return
    }
    setError('')
    setIsPending(true)
    try {
      await forgotPassword(email)
      setSubmitted(true)
    } catch {
      // Still show success to prevent user enumeration
      setSubmitted(true)
    } finally {
      setIsPending(false)
    }
  }

  if (submitted) {
    return (
      <AuthCard title="Check your inbox" subtitle="If an account with that email exists, we sent a reset link. It expires in 1 hour.">
        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t receive it? Check your spam folder.
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we'll send you a reset link">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </AuthCard>
  )
}
