import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RegisterSchema } from '@/lib/schemas/auth-schemas'
import { useRegister } from '../hooks/useRegister'
import { GoogleButton } from './GoogleButton'

export function RegisterForm() {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const register = useRegister()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = RegisterSchema.safeParse({
      email,
      display_name: displayName,
      password,
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
    register.mutate({
      email: result.data.email,
      password: result.data.password,
      display_name: result.data.display_name,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          type="text"
          placeholder="Jane Smith"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
        />
        {errors.display_name && <p className="text-xs text-destructive">{errors.display_name}</p>}
      </div>

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
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm_password">Confirm password</Label>
        <Input
          id="confirm_password"
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

      {register.error && (
        <p className="text-sm text-destructive">{(register.error as Error).message}</p>
      )}

      <Button type="submit" className="w-full" disabled={register.isPending}>
        {register.isPending ? 'Creating account…' : 'Create account'}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <GoogleButton />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/auth/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
