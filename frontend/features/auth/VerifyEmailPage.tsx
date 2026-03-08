import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AuthCard } from './components/AuthCard'
import { verifyEmail } from '@/lib/api/queries'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('No token provided.')
      return
    }
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err: Error) => {
        setStatus('error')
        setErrorMsg(err.message)
      })
  }, [token])

  if (status === 'pending') {
    return <AuthCard title="Verifying…" subtitle="Please wait while we verify your email.">{null}</AuthCard>
  }

  if (status === 'success') {
    return (
      <AuthCard title="Email verified!" subtitle="Your email address has been confirmed. You can close this tab or go to your dashboard.">{null}</AuthCard>
    )
  }

  return (
    <AuthCard title="Verification failed" subtitle={errorMsg || 'This link may have expired or already been used.'}>{null}</AuthCard>
  )
}
