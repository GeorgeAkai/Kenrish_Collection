import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/axios'
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'
import { LOGO_URL } from '@/lib/brand'

type Step = 'form' | 'verify'

export default function ChangePasswordPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('form')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [code, setCode] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const pwStrength = newPw.length >= 12 ? 3 : newPw.length >= 8 ? 2 : newPw.length >= 4 ? 1 : 0
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][pwStrength]
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-green-500'][pwStrength]

  async function handleRequestCode(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (newPw !== confirmPw) { setError('New passwords do not match.'); return }
    if (newPw.length < 8) { setError('New password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/change-password/request/', {
        current_password: currentPw,
        new_password: newPw,
      })
      setInfo(data.message)
      setStep('verify')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg ?? 'Failed to send code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/change-password/confirm/', { code })
      setInfo(data.message)
      setTimeout(() => {
        logout()
        navigate('/login', { replace: true })
      }, 1500)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg ?? 'Invalid or expired code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="Kenrish Collection" className="h-20 w-auto object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Change Password</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {step === 'form' ? 'Enter your current and new password' : 'Enter the code sent to your email'}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          <div className={`flex-1 h-1 rounded-full transition-colors ${step === 'form' ? 'bg-primary' : 'bg-primary'}`} />
          <div className={`flex-1 h-1 rounded-full transition-colors ${step === 'verify' ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {step === 'form' ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  className="input-field pr-10"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowCurrent(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  className="input-field pr-10"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowNew(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {newPw && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strengthColor}`}
                      style={{ width: `${(pwStrength / 3) * 100}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{strengthLabel}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm New Password</label>
              <input
                type={showNew ? 'text' : 'password'}
                required
                className="input-field"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
              <KeyRound size={15} />
              {loading ? 'Sending code…' : 'Send verification code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirm} className="space-y-4">
            {info && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-sm text-primary text-center">
                {info}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">Verification Code</label>
              <input
                type="text"
                required
                inputMode="numeric"
                maxLength={6}
                className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1.5 text-center">Enter the 6-digit code from your email</p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {info && step === 'verify' && loading === false && !error && (
              <div className="text-center text-xs text-muted-foreground">
                After confirming you'll be logged out to sign in with your new password.
              </div>
            )}

            <button type="submit" disabled={loading || code.length !== 6}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
              <ShieldCheck size={15} />
              {loading ? 'Confirming…' : 'Confirm change'}
            </button>

            <button type="button" onClick={() => { setStep('form'); setError(''); setCode('') }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
