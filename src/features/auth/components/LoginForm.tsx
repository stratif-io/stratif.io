import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoginSchema } from '@/lib/schemas/auth-schemas'
import { useLogin } from '../hooks/useLogin'
import { GoogleButton } from './GoogleButton'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const login = useLogin()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = LoginSchema.safeParse({ email, password })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message
      })
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    login.mutate(result.data)
  }

  return (
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
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>

      {login.error && (
        <p className="text-sm text-destructive">{(login.error as Error).message}</p>
      )}

      <Button type="submit" className="w-full" disabled={login.isPending}>
        {login.isPending ? 'Signing in…' : 'Sign in'}
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
        Don&apos;t have an account?{' '}
        <Link to="/auth/register" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  )
}
