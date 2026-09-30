import { useEffect, useState } from 'react'
import { Phone, MessageCircle, CalendarDays, CheckCircle2, Gem } from 'lucide-react'
import api from '@/lib/axios'
import { useToast } from '@/contexts/ToastContext'

interface LuxuryInquiry {
  id: number
  item: number
  item_name: string
  customer_display: string
  phone: string
  whatsapp: string
  preferred_viewing_date: string | null
  status: 'PENDING' | 'CONTACTED' | 'CLOSED'
  status_display: string
  admin_notes: string
  created_at: string
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CONTACTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  CLOSED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

export default function AdminLuxuryInquiriesPage() {
  const [inquiries, setInquiries] = useState<LuxuryInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [markingSold, setMarkingSold] = useState<LuxuryInquiry | null>(null)
  const [finalPrice, setFinalPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  function fetch() {
    setLoading(true)
    api.get<LuxuryInquiry[]>('/admin/luxury-inquiries/').then(r => setInquiries(r.data)).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(() => { fetch() }, [])

  async function setStatus(id: number, status: 'CONTACTED' | 'CLOSED') {
    try {
      await api.patch(`/admin/luxury-inquiries/${id}/`, { status })
      fetch()
    } catch {
      toast.error('Could not update this inquiry.')
    }
  }

  async function submitMarkSold(e: React.FormEvent) {
    e.preventDefault()
    if (!markingSold) return
    setSaving(true)
    try {
      await api.post(`/admin/luxury-inquiries/${markingSold.id}/mark-sold/`, { final_price: finalPrice })
      toast.success(`${markingSold.item_name} marked as sold.`)
      setMarkingSold(null)
      setFinalPrice('')
      fetch()
    } catch {
      toast.error('Could not mark this item as sold — check the price and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2"><Gem size={18} className="text-primary" /> Luxury Inquiries</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{inquiries.length} inquiries</p>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : inquiries.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No inquiries yet.</p>
      ) : (
        <div className="space-y-3">
          {inquiries.map(inq => (
            <div key={inq.id} className="border border-border rounded-2xl p-4 bg-card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold">{inq.item_name}</p>
                  <p className="text-sm text-muted-foreground">{inq.customer_display}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone size={11} /> {inq.phone}</span>
                    {inq.whatsapp && <span className="flex items-center gap-1"><MessageCircle size={11} /> {inq.whatsapp}</span>}
                    {inq.preferred_viewing_date && (
                      <span className="flex items-center gap-1"><CalendarDays size={11} /> {new Date(inq.preferred_viewing_date + 'T00:00:00').toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${STATUS_BADGE[inq.status]}`}>{inq.status_display}</span>
              </div>
              {inq.status !== 'CLOSED' && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                  {inq.status === 'PENDING' && (
                    <button onClick={() => setStatus(inq.id, 'CONTACTED')} className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted">
                      Mark Contacted
                    </button>
                  )}
                  <button
                    onClick={() => { setMarkingSold(inq); setFinalPrice('') }}
                    className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={12} /> Mark Sold
                  </button>
                  <button onClick={() => setStatus(inq.id, 'CLOSED')} className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted">
                    Close (no sale)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {markingSold && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="text-base font-semibold mb-1">Mark "{markingSold.item_name}" sold</h3>
            <p className="text-xs text-muted-foreground mb-4">Records the sale in Cash Flow and marks the item Sold.</p>
            <form onSubmit={submitMarkSold} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Final price (KES)</label>
                <input type="number" required min="1" className="input-field" value={finalPrice} onChange={e => setFinalPrice(e.target.value)} autoFocus />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving} className="flex-1 btn-primary disabled:opacity-60">{saving ? 'Saving…' : 'Confirm Sale'}</button>
                <button type="button" onClick={() => setMarkingSold(null)} className="flex-1 border border-border rounded-full py-2.5 text-sm hover:bg-muted">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
