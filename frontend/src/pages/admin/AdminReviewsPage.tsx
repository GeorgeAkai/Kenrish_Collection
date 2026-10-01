import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, X, Star } from 'lucide-react'
import api from '@/lib/axios'
import InlineConfirm from '@/components/InlineConfirm'
import { useConfirm } from '@/hooks/useConfirm'
import { useToast } from '@/contexts/ToastContext'

interface Review {
  id: number
  customer_name: string
  customer_label: string
  text: string
  rating: number
  shop: '' | 'beauty' | 'fashion'
  is_published: boolean
  created_at: string
}

const empty = { customer_name: '', customer_label: '', text: '', rating: 5, shop: '' as Review['shop'], is_published: true }
const SHOP_LABEL = { '': 'General', beauty: 'Beauty', fashion: 'Fashion' }

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-gold" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => <Star key={i} size={13} fill={i <= value ? 'currentColor' : 'none'} className={i <= value ? '' : 'text-muted-foreground/40'} />)}
    </span>
  )
}

/** Add, edit, hide and delete the customer reviews shown on the home page. */
export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Review | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const del = useConfirm<number>()
  const toast = useToast()

  const load = () => api.get<Review[]>('/admin/reviews/').then(r => setReviews(r.data)).catch(console.error).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setForm(empty); setError(''); setShowForm(true) }
  function openEdit(r: Review) {
    setEditing(r)
    setForm({ customer_name: r.customer_name, customer_label: r.customer_label, text: r.text, rating: r.rating, shop: r.shop, is_published: r.is_published })
    setError(''); setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      if (editing) await api.patch(`/admin/reviews/${editing.id}/`, form)
      else await api.post('/admin/reviews/', form)
      toast.success(editing ? 'Review updated.' : 'Review added.')
      setShowForm(false); load()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } }).response?.data
      setError(data && typeof data === 'object'
        ? Object.entries(data as Record<string, unknown>).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join('; ')
        : 'Save failed. Please try again.')
    } finally { setSaving(false) }
  }

  async function togglePublished(r: Review) {
    setBusyId(r.id)
    try {
      await api.patch(`/admin/reviews/${r.id}/`, { is_published: !r.is_published })
      setReviews(prev => prev.map(x => x.id === r.id ? { ...x, is_published: !r.is_published } : x))
    } catch { toast.error('Could not update this review.') } finally { setBusyId(null) }
  }

  async function handleDelete(id: number) {
    setBusyId(id); del.cancel()
    try { await api.delete(`/admin/reviews/${id}/`); toast.success('Review deleted.'); load() }
    catch { toast.error('Could not delete this review.') } finally { setBusyId(null) }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold">Customer Reviews</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reviews you add here appear in the “What clients say” section on the home page (latest 12 published).
            Only add feedback customers have given you.
          </p>
        </div>
        <button onClick={openCreate} className="btn-modern btn-modern--primary flex items-center gap-2 text-sm font-medium shrink-0">
          <Plus size={16} /> Add Review
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground border rounded-2xl">
          No reviews yet. Until you add one, the home page shows its built-in sample reviews.
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map(r => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-semibold">{r.customer_name}</p>
                    <Stars value={r.rating} />
                    <span className="text-xs text-muted-foreground">{SHOP_LABEL[r.shop]}</span>
                  </div>
                  {r.customer_label && <p className="text-xs text-muted-foreground">{r.customer_label}</p>}
                  <p className="text-sm mt-2 italic text-muted-foreground">“{r.text}”</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => togglePublished(r)} disabled={busyId === r.id}
                    title={r.is_published ? 'Click to hide from the site' : 'Click to show on the site'}
                    className={`inline-flex items-center h-6 px-2.5 rounded-full text-xs font-bold disabled:opacity-50 ${r.is_published ? 'bg-success-tint text-success' : 'bg-secondary text-muted-foreground'}`}>
                    {r.is_published ? 'Published' : 'Hidden'}
                  </button>
                  <button onClick={() => openEdit(r)} aria-label="Edit review" className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors"><Pencil size={13} /></button>
                  {del.isAsking(r.id)
                    ? <InlineConfirm onConfirm={() => handleDelete(r.id)} onCancel={del.cancel} loading={busyId === r.id} />
                    : <button onClick={() => del.ask(r.id)} aria-label="Delete review" className="w-8 h-8 flex items-center justify-center rounded-lg border text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={13} /></button>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-background rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-background">
              <h3 className="text-lg font-bold">{editing ? 'Edit' : 'Add'} review</h3>
              <button onClick={() => setShowForm(false)} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="rv-name">Customer name <span className="text-danger" aria-hidden="true">*</span></label>
                  <input id="rv-name" className="input-field" required maxLength={100} value={form.customer_name}
                    onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="rv-label">Label (optional)</label>
                  <input id="rv-label" className="input-field" maxLength={100} placeholder="e.g. Braids client" value={form.customer_label}
                    onChange={e => setForm(f => ({ ...f, customer_label: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="rv-text">Review <span className="text-danger" aria-hidden="true">*</span></label>
                <textarea id="rv-text" className="input-field min-h-[110px]" required value={form.text}
                  onChange={e => setForm(f => ({ ...f, text: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-sm font-medium mb-1.5">Rating <span className="text-danger" aria-hidden="true">*</span></span>
                  <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" role="radio" aria-checked={form.rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
                        onClick={() => setForm(f => ({ ...f, rating: n }))} className="p-1 text-gold">
                        <Star size={22} fill={n <= form.rating ? 'currentColor' : 'none'} className={n <= form.rating ? '' : 'text-muted-foreground/40'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="rv-shop">About <span className="font-normal text-muted-foreground">(optional)</span></label>
                  <select id="rv-shop" className="input-field" value={form.shop}
                    onChange={e => setForm(f => ({ ...f, shop: e.target.value as Review['shop'] }))}>
                    <option value="">General</option>
                    <option value="beauty">Kenrish Beauty</option>
                    <option value="fashion">Kenrish Fashion</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} className="w-4 h-4 accent-[var(--primary)]" />
                Show on the home page
              </label>
              {error && <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">{error}</div>}
              <div className="flex gap-3 pt-2 pb-2">
                <button type="submit" disabled={saving} className="btn-modern btn-modern--primary flex-1 text-sm font-semibold">{saving ? 'Saving…' : 'Save'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-modern btn-modern--secondary flex-1 text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
