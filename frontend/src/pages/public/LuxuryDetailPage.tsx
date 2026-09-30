import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Gem, Phone, MessageCircle, CalendarDays, CheckCircle } from 'lucide-react'
import api from '@/lib/axios'
import { formatKES } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

interface LuxuryItem {
  id: number
  name: string
  description: string
  image: string | null
  material: string
  dimensions: string
  provenance: string
  edition_size: number | null
  price: string | null
  availability: 'available' | 'reserved' | 'sold'
}

export default function LuxuryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [item, setItem] = useState<LuxuryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ phone: '', whatsapp: '', preferred_viewing_date: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    api.get<LuxuryItem>(`/luxury/${id}/`).then(r => setItem(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [id])

  function openInquiry() {
    if (!isAuthenticated) { navigate('/login'); return }
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api.post(`/luxury/${id}/inquire/`, form)
      setSuccess(true)
    } catch {
      setError('Could not send your inquiry. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-center text-muted-foreground py-24">Loading…</p>
  if (!item) return <p className="text-center text-muted-foreground py-24">Item not found.</p>

  const specs = [
    item.material && ['Material', item.material],
    item.dimensions && ['Dimensions', item.dimensions],
    item.edition_size && ['Edition', `Limited to ${item.edition_size}`],
    item.provenance && ['Provenance', item.provenance],
  ].filter(Boolean) as [string, string][]

  return (
    <div className="max-w-5xl mx-auto px-5 py-14 grid grid-cols-1 lg:grid-cols-2 gap-12">
      <div className="aspect-[4/5] rounded-sm overflow-hidden bg-muted">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Gem size={40} className="text-primary/30" /></div>
        )}
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--gold-ink)' }}>
          {item.availability === 'available' ? 'Available' : item.availability === 'reserved' ? 'Reserved' : 'Sold'}
        </p>
        <h1 className="text-3xl sm:text-4xl mb-4" style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif", fontWeight: 500 }}>
          {item.name}
        </h1>
        <p className="text-lg mb-6" style={{ color: 'var(--gold-ink)' }}>{item.price ? formatKES(item.price) : 'Price on Application'}</p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">{item.description}</p>

        {specs.length > 0 && (
          <dl className="space-y-2 mb-8 border-t border-border pt-6">
            {specs.map(([label, value]) => (
              <div key={label} className="flex gap-4 text-sm">
                <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}

        {item.availability === 'sold' ? (
          <p className="text-sm text-muted-foreground italic">This piece has been sold.</p>
        ) : success ? (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle size={16} className="text-primary" /> Inquiry sent — we'll be in touch. <Link to="/luxury/inquiries" className="underline">Track it here</Link>.
          </div>
        ) : (
          <button onClick={openInquiry} className="btn-primary" style={{ borderRadius: 'var(--radius-lux)' }}>
            Inquire / Reserve Item
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card rounded-sm shadow-pop w-full max-w-sm p-6">
            <h3 className="text-base font-semibold mb-1">Concierge Inquiry</h3>
            <p className="text-xs text-muted-foreground mb-5">Leave your details and preferred viewing date — a named contact will follow up.</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1.5"><Phone size={12} /> Phone</label>
                <input type="tel" required className="input-field" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1.5"><MessageCircle size={12} /> WhatsApp <span className="font-normal text-muted-foreground">(optional)</span></label>
                <input type="tel" className="input-field" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1.5"><CalendarDays size={12} /> Preferred viewing date <span className="font-normal text-muted-foreground">(optional)</span></label>
                <input type="date" min={new Date().toISOString().split('T')[0]} className="input-field" value={form.preferred_viewing_date} onChange={e => setForm(f => ({ ...f, preferred_viewing_date: e.target.value }))} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving} className="flex-1 btn-primary disabled:opacity-60">{saving ? 'Sending…' : 'Send Inquiry'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-border rounded-full py-2.5 text-sm hover:bg-muted">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
