import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { api, getErrorMessage } from '@/lib/api'

function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  return { a, b, answer: a + b }
}

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const emailId = useId()
  const passId = useId()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [captcha, setCaptcha] = useState(generateCaptcha)
  const [captchaInput, setCaptchaInput] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.')
      return
    }

    if (parseInt(captchaInput, 10) !== captcha.answer) {
      setError('Captcha answer is incorrect.')
      setCaptcha(generateCaptcha())
      setCaptchaInput('')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email: email.trim(), password })
      const { accessToken, user } = res.data
      setAuth(user, accessToken)
      navigate(`/${user.role}/dashboard`, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
      setCaptcha(generateCaptcha())
      setCaptchaInput('')
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

      <section className="auth-shell">
        <div className="auth-copy">
          <span className="auth-eyebrow">ESG Score Platform</span>
          <h1>Sign in to the ESG Score System</h1>
          <p>
            Access your role-based ESG workflow, from participant submission to assessment review and finalization.
          </p>
        </div>

        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <div className="auth-card-head auth-card-head-tight">
            <h2>Sign In</h2>
            <p>Sign in with your registered email and password.</p>
          </div>

          <label className="auth-field" htmlFor={emailId}>
            <span>Email</span>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-field" htmlFor={passId}>
            <span>Password</span>
            <div className="auth-password">
              <input
                id={passId}
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="auth-icon-button"
                onClick={() => setShowPass((value) => !value)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </label>

          <div className="captcha-box">
            <div className="captcha-question">
              <span>Captcha</span>
              <strong>{captcha.a} + {captcha.b} = ?</strong>
            </div>
            <button
              type="button"
              className="captcha-refresh"
              onClick={() => {
                setCaptcha(generateCaptcha())
                setCaptchaInput('')
              }}
              aria-label="Refresh captcha"
            >
              <RefreshCw size={19} />
            </button>
            <label className="auth-field captcha-answer">
              <span>Your answer</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Result"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                required
              />
            </label>
          </div>

          <p className="auth-message" role="status" aria-live="polite">{error}</p>

          <button type="submit" disabled={loading} className="auth-submit">
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            <LogIn size={20} />
          </button>

          <p className="auth-switch">
            <Link to="/forgot-password">Forgot password?</Link> <span className="auth-switch-divider">•</span> {' '}
            <Link to="/register">Register as participant</Link>
          </p>
        </form>
      </section>
    </main>
  )
}
