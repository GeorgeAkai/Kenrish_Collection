import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/axios'
import { Eye, EyeOff, Sparkles } from 'lucide-react'
import { LOGO_URL } from '@/lib/brand'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from ?? '/'

  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login/', form)
      const me = await api.get('/auth/me/', {
        headers: { Authorization: `Bearer ${data.access}` },
      })
      login(me.data, data.access, data.refresh)
      navigate(me.data.is_staff ? '/admin' : from, { replace: true })
    } catch {
      setError('Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex">
      {/* Left decorative panel — hidden on small screens */}
      <div className="hidden lg:flex w-1/2 bg-primary items-center justify-center relative overflow-hidden">
        <div className="relative text-center text-primary-foreground px-12">
          <Sparkles size={40} className="text-primary-foreground/80 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Georgia, serif' }}>Welcome Back</h2>
          <p className="text-primary-foreground/70 text-sm leading-relaxed">
            Sign in to manage your wishlist, track your orders, and access exclusive member offers.
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="mb-4">
              <img src={LOGO_URL} alt="Kenrish Collection" className="h-16 w-auto object-contain mx-auto" />
            </div>
            <h1 className="text-2xl font-bold">Sign in to your account</h1>
            <p className="text-muted-foreground text-sm mt-1">Enter your details below</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email or Username</label>
              <input
                type="text"
                required
                autoComplete="username"
                className="input-field"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="input-field pr-10"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all active:scale-[0.99]"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            No account?{' '}
            <Link to="/signup" className="text-primary hover:underline font-medium underline-offset-2">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
