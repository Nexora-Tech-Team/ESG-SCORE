import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Eye, EyeOff, RefreshCw, UserPlus, XCircle } from 'lucide-react'
import { api, getErrorMessage } from '@/lib/api'
import { sectorOptions } from '@/constants/sectors'

function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  return { a, b, answer: a + b }
}

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

export default function Register() {
  const navigate = useNavigate()
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
  const [sector, setSector] = useState<string>(sectorOptions[0])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captcha, setCaptcha] = useState(generateCaptcha)
  const [captchaInput, setCaptchaInput] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [successVisible, setSuccessVisible] = useState(false)

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
    if (!successVisible) {
      return undefined
    }
    const timer = window.setTimeout(() => {
      navigate('/login', { replace: true })
    }, 2200)
    return () => window.clearTimeout(timer)
  }, [navigate, successVisible])

  useEffect(() => {
    const value = email.trim().toLowerCase()
    if (!value) {
      setEmailStatus('idle')
      return undefined
    }
    const timer = window.setTimeout(async () => {
      try {
        setEmailStatus('checking')
        const res = await api.post('/auth/check-email', { email: value })
        setEmailStatus(res.data?.exists ? 'taken' : 'available')
      } catch {
        setEmailStatus('idle')
      }
    }, 500)
    return () => window.clearTimeout(timer)
  }, [email])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!company.trim() || !position.trim() || !sector.trim() || !name.trim() || !email.trim() || !password.trim()) {
      setError('All required fields must be filled in.')
      return
    }
    if (emailStatus === 'taken') {
      setError('This email is already registered.')
      return
    }
    if (!passwordsStrong) {
      setError('Password must be at least 8 characters long and include an uppercase letter, a number, and a symbol.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
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
      await api.post('/auth/register', {
        company: company.trim(),
        position: position.trim(),
        sector: sector.trim(),
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
      })
      setSuccessMessage('Your account has been created. Redirecting to the sign in page...')
      setSuccessVisible(true)
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
        {successVisible && (
          <div className="auth-popup-backdrop">
            <div className="auth-popup" role="status" aria-live="polite">
              <span className="auth-popup-icon">
                <CheckCircle2 size={40} />
              </span>
              <strong>Registration successful!</strong>
              <span>{successMessage}</span>
            </div>
          </div>
        )}
        <div className="auth-copy">
          <span className="auth-eyebrow">Participant Registration</span>
          <h1>Create your ESG Score participant account</h1>
          <p>
            Use this account to complete the ESG checklist, upload evidence, and follow the review status from admin and assessor.
          </p>
        </div>

        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <div className="auth-card-head">
            <h2>Register</h2>
            <p>Participant accounts are created for company representatives.</p>
          </div>

          <label className="auth-field">
            <span>Company Name</span>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company legal name" required />
          </label>

          <label className="auth-field">
            <span>Full Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account owner name" required />
          </label>

          <label className="auth-field">
            <span>Position</span>
            <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Job title / role" required />
          </label>

          <label className="auth-field">
            <span>Sector</span>
            <select value={sector} onChange={(e) => setSector(e.target.value)}>
              {sectorOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="auth-field">
            <span>Work Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required />
            {emailStatus === 'checking' && <small className="auth-hint">Checking email availability...</small>}
            {emailStatus === 'available' && <small className="auth-message-success">Email is available.</small>}
            {emailStatus === 'taken' && <small className="auth-message">Email is already registered.</small>}
          </label>

          <label className="auth-field">
            <span>Phone / WhatsApp</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+62 812 0000 0000" />
          </label>

          <div className="auth-field-group">
            <label className="auth-field">
              <span>Password</span>
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
          </div>

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

          <button type="submit" className="auth-submit" disabled={loading}>
            <span>{loading ? 'Creating...' : 'Create Account'}</span>
            <UserPlus size={20} />
          </button>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </section>
    </main>
  )
}
