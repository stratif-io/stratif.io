import { AuthCard } from './components/AuthCard'
import { LoginForm } from './components/LoginForm'

export function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your OpenFlow account"
    >
      <LoginForm />
    </AuthCard>
  )
}
