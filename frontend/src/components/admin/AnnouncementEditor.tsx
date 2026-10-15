import { useState, type FormEvent } from 'react'
import { Megaphone, Trash2 } from 'lucide-react'
import api from '@/lib/axios'
import { useAdminQuery, useInvalidateAdmin } from '@/lib/adminQuery'
import { useToast } from '@/contexts/ToastContext'
import type { Announcement } from '@/lib/notifications'

const EMPTY = { message: '', tone: 'gold' as Announcement['tone'], link_label: '', link_url: '', starts_at: '', ends_at: '', dismissible: true }

const TONE_LABEL: Record<Announcement['tone'], string> = { gold: 'Offer (gold)', dark: 'Notice (dark)', warning: 'Service problem (warning)' }

function status(a: Announcement, now = new Date()) {
  if (!a.is_active) return { label: 'Off', cls: 'bg-secondary text-muted-foreground' }
  if (a.starts_at && new Date(a.starts_at) > now) return { label: 'Scheduled', cls: 'bg-warning-tint text-warning' }
  if (a.ends_at && new Date(a.ends_at) <= now) return { label: 'Ended', cls: 'bg-secondary text-muted-foreground' }
  return { label: 'Live', cls: 'bg-success-tint text-success' }
}

const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null

/**
 * The site-wide announcement bar: one line above the header for an offer, a closure or holiday hours.
 * The newest live one is shown to every visitor; each visitor can dismiss it.
 */
export default function AnnouncementEditor() {
  const list = useAdminQuery<Announcement[]>('/admin/announcements/')
  const refresh = useInvalidateAdmin()
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const items = list.data ?? []

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api.post('/admin/announcements/', {
        ...form,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      })
      setForm(EMPTY)
      refresh()
      toast.show({ title: 'Announcement published', description: 'Visitors see it at the top of every page.', icon: Megaphone })
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data
      setError(data ? Object.values(data).flat().join(' ') : 'Could not save the announcement.')
    } finally { setSaving(false) }
  }

  async function toggle(a: Announcement) {
    await api.patch(`/admin/announcements/${a.id}/`, { is_active: !a.is_active })
    refresh()
  }

  async function remove(a: Announcement) {
    await api.delete(`/admin/announcements/${a.id}/`)
    refresh()
    toast.show({ title: 'Announcement deleted', tone: 'info' })
  }

  const preview = form.message.trim()
  const toneBar = form.tone === 'dark' ? 'bg-inverse text-inverse-foreground' : form.tone === 'warning' ? 'bg-warning-tint text-warning' : 'bg-primary text-primary-foreground'

  return (
    <section className="bg-card border border-border rounded-[20px] p-4 lg:p-6 shadow-card mb-8">
      <div className="flex items-start gap-3 mb-4">
        <span className="w-10 h-10 rounded-full bg-gold-tint text-gold-ink flex items-center justify-center shrink-0"><Megaphone size={18} /></span>
        <div>
          <h2 className="font-heading text-xl font-semibold">Announcement bar</h2>
          <p className="text-sm text-muted-foreground">One line above the site header for an offer, a closure or holiday hours. Only the newest live one shows.</p>
        </div>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="sm:col-span-2 text-sm font-medium">
          Message
          <input className="input-field mt-1" required maxLength={200} value={form.message}
            placeholder="25% off all braiding until 31 Oct" onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
        </label>
        <label className="text-sm font-medium">
          Style
          <select className="input-field mt-1" value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value as Announcement['tone'] }))}>
            {(Object.keys(TONE_LABEL) as Announcement['tone'][]).map(t => <option key={t} value={t}>{TONE_LABEL[t]}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium sm:pt-6">
          <input type="checkbox" checked={form.dismissible} onChange={e => setForm(f => ({ ...f, dismissible: e.target.checked }))} />
          Visitors can dismiss it
        </label>
        <label className="text-sm font-medium">
          Button text <span className="font-normal text-muted-foreground">(optional)</span>
          <input className="input-field mt-1" maxLength={40} value={form.link_label} placeholder="Book now"
            onChange={e => setForm(f => ({ ...f, link_label: e.target.value }))} />
        </label>
        <label className="text-sm font-medium">
          Button link <span className="font-normal text-muted-foreground">(optional)</span>
          <input className="input-field mt-1" maxLength={255} value={form.link_url} placeholder="/beauty/services"
            onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} />
        </label>
        <label className="text-sm font-medium">
          Starts <span className="font-normal text-muted-foreground">(blank = now)</span>
          <input type="datetime-local" className="input-field mt-1" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} />
        </label>
        <label className="text-sm font-medium">
          Ends <span className="font-normal text-muted-foreground">(blank = until turned off)</span>
          <input type="datetime-local" className="input-field mt-1" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} />
        </label>

        {preview && (
          <div className={`sm:col-span-2 rounded-xl px-4 py-2.5 text-sm font-medium ${toneBar}`} aria-label="Preview">
            {preview}{form.link_label && <span className="ml-2 font-bold underline">{form.link_label} →</span>}
          </div>
        )}
        {error && <p role="alert" className="sm:col-span-2 text-sm text-danger">{error}</p>}
        <div className="sm:col-span-2">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? 'Publishing…' : 'Publish announcement'}</button>
        </div>
      </form>

      {items.length > 0 && (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {items.map(a => {
            const st = status(a)
            return (
              <li key={a.id} className="py-3 flex flex-wrap items-center gap-3">
                <span className={`h-6 px-2.5 rounded-full text-xs font-bold flex items-center ${st.cls}`}>{st.label}</span>
                <div className="flex-1 min-w-[12rem]">
                  <p className="text-sm font-semibold">{a.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {TONE_LABEL[a.tone]}{fmt(a.starts_at) && ` · from ${fmt(a.starts_at)}`}{fmt(a.ends_at) && ` · until ${fmt(a.ends_at)}`}
                  </p>
                </div>
                <button onClick={() => toggle(a)} className="h-9 px-4 rounded-full border border-border-control text-[13px] font-semibold hover:bg-secondary">
                  {a.is_active ? 'Turn off' : 'Turn on'}
                </button>
                <button onClick={() => remove(a)} aria-label={`Delete "${a.message}"`}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-danger hover:bg-danger-tint">
                  <Trash2 size={16} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
