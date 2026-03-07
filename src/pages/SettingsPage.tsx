import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChangePasswordSchema } from '@/lib/schemas/auth-schemas'
import { changePassword } from '@/lib/api/queries'
import { SPACING } from '@/lib/constants'

export function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = ChangePasswordSchema.safeParse({
      current_password: currentPassword || undefined,
      new_password: newPassword,
      confirm_password: confirmPassword,
    })
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
      await changePassword(currentPassword || null, newPassword)
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setApiError((err as Error).message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className={SPACING.page}>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Settings</h1>

      <div className="max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Update your account password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
                {errors.current_password && (
                  <p className="text-xs text-destructive">{errors.current_password}</p>
                )}
              </div>
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
                {errors.new_password && (
                  <p className="text-xs text-destructive">{errors.new_password}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                {errors.confirm_password && (
                  <p className="text-xs text-destructive">{errors.confirm_password}</p>
                )}
              </div>
              {apiError && <p className="text-sm text-destructive">{apiError}</p>}
              {success && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Password updated successfully.
                </p>
              )}
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Update password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
