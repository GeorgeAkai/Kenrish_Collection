import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/axios'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { LOGO_URL } from '@/lib/brand'

export default function SignupPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const pwStrength = form.password.length >= 12 ? 3 : form.password.length >= 8 ? 2 : form.password.length >= 4 ? 1 : 0
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][pwStrength]
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-green-500'][pwStrength]

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

  function validate() {
    const e: Record<string, string> = {}
    if (!form.username.trim()) e.username = 'Username is required'
    if (!form.email.trim()) {
      e.email = 'Email is required'
    } else if (!EMAIL_RE.test(form.email.trim())) {
      e.email = 'Enter a valid email address (e.g. you@example.com)'
    }
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    return e
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register/', {
        username: form.username,
        email: form.email,
        password: form.password,
      })
      login(data.user, data.access, data.refresh)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, string[]> } }).response
      if (response?.data) {
        const mapped: Record<string, string> = {}
        for (const [k, v] of Object.entries(response.data)) {
          mapped[k] = Array.isArray(v) ? v[0] : String(v)
        }
        setErrors(mapped)
      } else {
        setErrors({ general: 'Registration failed. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mb-4">
            <img src={LOGO_URL} alt="Kenrish Collection" className="h-24 w-auto object-contain mx-auto" />
          </div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm mt-1">Join thousands of style enthusiasts</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Username</label>
            <input type="text" required autoComplete="username"
              className={`input-field ${errors.username ? 'border-destructive' : ''}`}
              value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="your_username" />
            {errors.username && <p className="text-xs text-destructive mt-1">{errors.username}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input type="email" required autoComplete="email"
              className={`input-field ${errors.email ? 'border-destructive' : ''}`}
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} required autoComplete="new-password"
                className={`input-field pr-10 ${errors.password ? 'border-destructive' : ''}`}
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {form.password && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strengthColor}`}
                    style={{ width: `${(pwStrength / 3) * 100}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">{strengthLabel}</span>
              </div>
            )}
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
          </div>

          {/* Confirm */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} required autoComplete="new-password"
                className={`input-field pr-10 ${errors.confirm ? 'border-destructive' : ''}`}
                value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="••••••••" />
              {form.confirm && form.confirm === form.password && (
                <CheckCircle2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
              )}
            </div>
            {errors.confirm && <p className="text-xs text-destructive mt-1">{errors.confirm}</p>}
          </div>

          {errors.general && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
              {errors.general}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all active:scale-[0.99]">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium underline-offset-2">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
