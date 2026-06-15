import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import api from '@/lib/axios'
import {
  Camera, Heart, ShoppingBag, CalendarDays, Lock, Sun, Moon, Trash2, User, AlertTriangle,
} from 'lucide-react'

interface Profile {
  username: string
  email: string
  date_joined: string
  avatar: string | null
  bio: string
  phone: string
}

export default function ProfilePage() {
  const { logout } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.get('/profile/').then(r => {
      setProfile(r.data)
      setBio(r.data.bio ?? '')
      setPhone(r.data.phone ?? '')
    }).catch(() => navigate('/login', { replace: true }))
  }, [navigate])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('avatar', file)
    try {
      const { data } = await api.patch('/profile/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setProfile(data)
    } catch { /* ignore */ }
  }

  async function handleSaveProfile() {
    setSaving(true)
    setSaveMsg('')
    try {
      const { data } = await api.patch('/profile/', { bio, phone })
      setProfile(data)
      setSaveMsg('Profile updated.')
    } catch {
      setSaveMsg('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      await api.delete('/profile/delete/')
      logout()
      navigate('/', { replace: true })
    } catch {
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Loading profile…
      </div>
    )
  }

  const initials = profile.username.slice(0, 2).toUpperCase()

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">

      {/* ── Avatar + Basic Info ── */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">
        <div className="relative shrink-0">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
            {profile.avatar
              ? <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
              : <span className="text-2xl font-bold text-primary">{initials}</span>
            }
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-all"
            aria-label="Change avatar"
          >
            <Camera size={14} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold">{profile.username}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{profile.email}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Member since {new Date(profile.date_joined).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* ── Edit Bio / Phone ── */}
      <div className="border border-border rounded-2xl p-5 mb-4">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><User size={16} /> Profile Details</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Tell us a bit about yourself…"
              className="input-field resize-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+254 7XX XXX XXX"
              className="input-field text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {saveMsg && <span className="text-xs text-muted-foreground">{saveMsg}</span>}
          </div>
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {[
          { to: '/wishlist', icon: <Heart size={18} />, label: 'My Wishlist', desc: 'Items you\'ve saved' },
          { to: '/orders', icon: <ShoppingBag size={18} />, label: 'My Orders', desc: 'Track your purchases' },
          { to: '/reservation', icon: <CalendarDays size={18} />, label: 'Reservations', desc: 'Upcoming bookings' },
          { to: '/change-password', icon: <Lock size={18} />, label: 'Change Password', desc: 'Update your password' },
        ].map(({ to, icon, label, desc }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 p-4 rounded-2xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
          >
            <span className="text-primary group-hover:scale-110 transition-transform">{icon}</span>
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Theme Setting ── */}
      <div className="border border-border rounded-2xl p-5 mb-4">
        <h2 className="font-semibold mb-3">Theme</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
              theme === 'light'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-muted-foreground'
            }`}
          >
            <Sun size={15} /> Light
          </button>
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
              theme === 'dark'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-muted-foreground'
            }`}
          >
            <Moon size={15} /> Dark
          </button>
        </div>
      </div>

      {/* ── Delete Account ── */}
      <div className="border border-red-200 dark:border-red-900/50 rounded-2xl p-5">
        <h2 className="font-semibold text-red-600 dark:text-red-400 mb-1 flex items-center gap-2">
          <Trash2 size={16} /> Delete Account
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Deactivate your account. Your data is preserved but you won't be able to sign in.
        </p>
        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="px-4 py-2 rounded-xl border-2 border-red-400 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
          >
            Delete my account
          </button>
        ) : (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
              <AlertTriangle size={16} />
              <span className="text-sm font-semibold">Are you absolutely sure?</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              This will deactivate your account immediately. You will be signed out.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-all"
              >
                {deleting ? 'Deleting…' : 'Yes, delete it'}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
