import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Mail } from 'lucide-react'
import { api, getErrorMessage } from '@/lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetUrl, setResetUrl] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setResetUrl('')
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() })
      setMessage(res.data?.message ?? 'If the email exists, password reset instructions will be sent.')
      setResetUrl(res.data?.resetUrl ?? '')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-bg" aria-hidden="true" />
      <div className="auth-overlay" aria-hidden="true" />

      <a href="#" className="auth-brand" aria-label="CBQA Global">
        <img src="/assets/oneconnect/cbqa-logo.png" alt="CBQA Global" />
      </a>

      <section className="auth-shell auth-shell-register">
        <div className="auth-copy">
          <span className="auth-eyebrow">Account Recovery</span>
          <h1>Reset your password</h1>
          <p>
            Enter your registered email address and we will send a reset instruction for your ESG Score account.
          </p>
        </div>

        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <div className="auth-card-head">
            <h2>Forgot Password</h2>
            <p>We will use your email to look up the account.</p>
          </div>

          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              autoComplete="email"
              required
            />
            <small className="auth-hint">We will send the reset link to this address.</small>
          </label>

          {error && <p className="auth-message" role="status" aria-live="polite">{error}</p>}
          {message && <p className="auth-message auth-message-success" role="status" aria-live="polite">{message}</p>}
          {resetUrl && (
            <a className="auth-reset-link" href={resetUrl}>
              Open reset link
              <ExternalLink size={16} />
            </a>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            <span>{loading ? 'Sending...' : 'Send Reset Link'}</span>
            <Mail size={20} />
          </button>

          <p className="auth-switch">
            <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      </section>
    </main>
  )
}
