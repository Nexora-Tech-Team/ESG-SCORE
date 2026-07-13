import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Eye, EyeOff, Lock, RefreshCw, XCircle } from 'lucide-react'
import { api, getErrorMessage } from '@/lib/api'

function hasUppercase(value: string) {
  return /[A-Z]/.test(value)
}

function hasNumber(value: string) {
  return /\d/.test(value)
}

function hasSymbol(value: string) {
  return /[^A-Za-z0-9]/.test(value)
}

function generateStrongPassword(length = 12) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const numbers = '23456789'
  const symbols = '!@#$%&*?'
  const all = `${upper}${lower}${numbers}${symbols}`
  const seed = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ]
  while (seed.length < length) {
    seed.push(all[Math.floor(Math.random() * all.length)])
  }
  for (let i = seed.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[seed[i], seed[j]] = [seed[j], seed[i]]
  }
  return seed.join('')
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const { token = '' } = useParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const passwordChecks = [
    { label: 'Minimum 8 characters', valid: password.length >= 8 },
    { label: 'At least one uppercase letter', valid: hasUppercase(password) },
    { label: 'At least one number', valid: hasNumber(password) },
    { label: 'At least one symbol', valid: hasSymbol(password) },
  ]
  const passwordMatches = confirmPassword.length > 0 && password === confirmPassword
  const passwordsStrong = passwordChecks.every((item) => item.valid)

  function fillStrongPassword() {
    const nextPassword = generateStrongPassword()
    setPassword(nextPassword)
    setConfirmPassword(nextPassword)
    setShowPassword(true)
    setShowConfirmPassword(true)
  }

  useEffect(() => {
    if (!message) {
      return undefined
    }
    const timer = window.setTimeout(() => {
      navigate('/login', { replace: true })
    }, 1600)
    return () => window.clearTimeout(timer)
  }, [message, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!token) {
      setError('Reset token is missing.')
      return
    }
    if (!passwordsStrong) {
      setError('Password must be at least 8 characters long and include an uppercase letter, a number, and a symbol.')
      return
    }
    if (!passwordMatches) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/auth/reset-password', {
        token,
        password,
        confirmPassword,
      })
      setMessage(res.data?.message ?? 'Password updated successfully.')
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
          <h1>Create a new password</h1>
          <p>
            Set a new password for your ESG Score account. Use the reset link from your email or the generated link in development.
          </p>
        </div>

        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <div className="auth-card-head auth-card-head-tight">
            <h2>Reset Password</h2>
            <p>Choose a secure password for your account.</p>
          </div>

          <label className="auth-field">
            <span>New Password</span>
            <div className="auth-password">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="auth-icon-button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </label>

          <label className="auth-field">
            <span>Confirm Password</span>
            <div className="auth-password">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="auth-icon-button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </label>

          <div className="auth-password-policy" aria-live="polite">
            <div className="auth-password-policy-head">
              <span>Password requirements</span>
              <p>Use at least 8 characters, one uppercase letter, one number, and one symbol.</p>
            </div>
            <button type="button" className="auth-password-generate" onClick={fillStrongPassword}>
              <RefreshCw size={16} />
              <span>Generate strong password</span>
            </button>
            <ul className="auth-password-checklist">
              {passwordChecks.map((item) => (
                <li key={item.label} className={item.valid ? 'is-valid' : 'is-invalid'}>
                  {item.valid ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  <span>{item.label}</span>
                </li>
              ))}
              <li className={passwordMatches ? 'is-valid' : 'is-invalid'}>
                {passwordMatches ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span>Passwords match</span>
              </li>
            </ul>
          </div>

          {error && <p className="auth-message" role="status" aria-live="polite">{error}</p>}
          {message && <p className="auth-message auth-message-success" role="status" aria-live="polite">{message}</p>}

          <button type="submit" disabled={loading} className="auth-submit">
            <span>{loading ? 'Updating...' : 'Update Password'}</span>
            <Lock size={20} />
          </button>

          <p className="auth-switch">
            <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      </section>
    </main>
  )
}
