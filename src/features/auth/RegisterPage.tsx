import { AuthCard } from './components/AuthCard'
import { RegisterForm } from './components/RegisterForm'

export function RegisterPage() {
  return (
    <AuthCard title="Create your account" subtitle="Start analyzing your product data today">
      <RegisterForm />
    </AuthCard>
  )
}
