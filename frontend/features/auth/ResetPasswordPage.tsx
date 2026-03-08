import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AuthCard } from './components/AuthCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResetPasswordSchema } from '@/lib/schemas/auth-schemas'
import { resetPassword } from '@/lib/api/queries'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <AuthCard title="Invalid link" subtitle="This password reset link is missing or malformed.">{null}</AuthCard>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = ResetPasswordSchema.safeParse({ new_password: newPassword, confirm_password: confirmPassword })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message
      })
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    setApiError('')
    setIsPending(true)
    try {
      await resetPassword(token, newPassword)
      setDone(true)
      setTimeout(() => navigate('/auth/login'), 2000)
    } catch (err) {
      setApiError((err as Error).message)
    } finally {
      setIsPending(false)
    }
  }

  if (done) {
    return (
      <AuthCard title="Password reset!" subtitle="Your password has been updated. Redirecting to login…">{null}</AuthCard>
    )
  }

  return (
    <AuthCard title="Reset your password" subtitle="Enter a new password for your account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          {errors.new_password && <p className="text-xs text-destructive">{errors.new_password}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          {errors.confirm_password && <p className="text-xs text-destructive">{errors.confirm_password}</p>}
        </div>
        {apiError && <p className="text-sm text-destructive">{apiError}</p>}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>
    </AuthCard>
  )
}
