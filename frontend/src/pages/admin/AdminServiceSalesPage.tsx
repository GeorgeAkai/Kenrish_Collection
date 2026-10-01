import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import api from '@/lib/axios'
import { formatKES, NAIROBI_TZ, toNairobiInput, fromNairobiInput } from '@/lib/utils'
import type { Service, PaginatedResponse } from '@/lib/types'
import InlineConfirm from '@/components/InlineConfirm'
import { useConfirm } from '@/hooks/useConfirm'
import { useToast } from '@/contexts/ToastContext'

interface ServiceSale {
  id: number
  service: number | null
  service_name: string
  amount: string
  payment_method: string
  payment_method_display: string
  customer_name: string
  customer_phone: string
  notes: string
  served_at: string
  created_by_username: string
}

interface SalesPage extends PaginatedResponse<ServiceSale> { total_amount: number | string }

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
]

const emptyForm = () => ({
  service: '', service_name: '', amount: '', payment_method: 'cash',
  customer_name: '', customer_phone: '', notes: '', served_at: toNairobiInput(),
})

const suggestedPrice = (s: Service) => s.price ?? s.price_from ?? ''

export default function AdminServiceSalesPage() {
  const [sales, setSales] = useState<ServiceSale[]>([])
  const [total, setTotal] = useState<number>(0)
  const [count, setCount] = useState(0)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [editing, setEditing] = useState<ServiceSale | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const del = useConfirm<number>()
  const toast = useToast()

  const load = useCallback(() => {
    const params = new URLSearchParams({ page_size: '100' })
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    return api.get<SalesPage>(`/admin/service-sales/?${params}`).then(r => {
      setSales(r.data.results)
      setCount(r.data.count)
      setTotal(Number(r.data.total_amount))
    }).catch(console.error).finally(() => setLoading(false))
  }, [dateFrom, dateTo])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get<Service[]>('/services/').then(r => setServices(r.data)).catch(console.error)
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setError('')
    setShowForm(true)
  }

  function openEdit(s: ServiceSale) {
    setEditing(s)
    setForm({
      service: s.service ? String(s.service) : '', service_name: s.service_name, amount: s.amount,
      payment_method: s.payment_method, customer_name: s.customer_name, customer_phone: s.customer_phone,
      notes: s.notes, served_at: toNairobiInput(s.served_at),
    })
    setError('')
    setShowForm(true)
  }

  function pickService(id: string) {
    const svc = services.find(s => String(s.id) === id)
    setForm(f => ({
      ...f,
      service: id,
      service_name: svc ? svc.name : f.service_name,
      // Pre-fill the listed price, but only while the amount is still untouched.
      amount: svc && (!f.amount || !editing) ? String(suggestedPrice(svc)) : f.amount,
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const body = {
      service: form.service ? Number(form.service) : null,
      service_name: form.service_name,
      amount: form.amount,
      payment_method: form.payment_method,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      notes: form.notes,
      served_at: fromNairobiInput(form.served_at),
    }
    try {
      if (editing) await api.patch(`/admin/service-sales/${editing.id}/`, body)
      else await api.post('/admin/service-sales/', body)
      toast.success(editing ? 'Sale updated.' : 'Sale recorded.')
      setShowForm(false)
      load()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } }).response?.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setError(Object.entries(data as Record<string, unknown>)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join('; '))
      } else {
        setError('Save failed. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    del.cancel()
    try {
      await api.delete(`/admin/service-sales/${id}/`)
      toast.success('Sale deleted.')
      load()
    } catch {
      toast.error('Could not delete this sale.')
    } finally {
      setDeletingId(null)
    }
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short', timeZone: NAIROBI_TZ })

  const rowActions = (s: ServiceSale) => (
    <div className="flex justify-end items-center gap-2">
      <button onClick={() => openEdit(s)} aria-label="Edit sale"
        className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors">
        <Pencil size={13} />
      </button>
      {del.isAsking(s.id) ? (
        <InlineConfirm onConfirm={() => handleDelete(s.id)} onCancel={del.cancel} loading={deletingId === s.id} />
      ) : (
        <button onClick={() => del.ask(s.id)} aria-label="Delete sale"
          className="w-8 h-8 flex items-center justify-center rounded-lg border text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold">Service Sales</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Record salon services that were paid for. They count as Kenrish Beauty income on the dashboards.
          </p>
        </div>
        <button onClick={openCreate} className="btn-modern btn-modern--primary flex items-center gap-2 text-sm font-medium shrink-0">
          <Plus size={16} /> Record Sale
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1" htmlFor="ss-from">From</label>
          <input id="ss-from" type="date" className="input-field" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1" htmlFor="ss-to">To</label>
          <input id="ss-to" type="date" className="input-field" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-sm text-muted-foreground underline underline-offset-2 pb-2.5">Clear</button>
        )}
        <div className="sm:ml-auto rounded-2xl border border-border bg-card px-4 py-2.5 shadow-card">
          <p className="text-xs text-muted-foreground">{count} sale{count === 1 ? '' : 's'}{dateFrom || dateTo ? ' in range' : ''}</p>
          <p className="text-lg font-bold tabular-nums">{formatKES(total)}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : sales.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground border rounded-2xl">No service sales recorded yet.</div>
      ) : (
        <>
          <div className="hidden sm:block border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Service</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Payment</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{s.service_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.customer_name || '-'}{s.customer_phone && <span className="block text-xs">{s.customer_phone}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(s.served_at)}</td>
                    <td className="px-4 py-3">{s.payment_method_display}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatKES(s.amount)}</td>
                    <td className="px-4 py-3">{rowActions(s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden space-y-3">
            {sales.map(s => (
              <div key={s.id} className="product-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{s.service_name}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(s.served_at)} · {s.payment_method_display}</p>
                    {(s.customer_name || s.customer_phone) && (
                      <p className="text-xs text-muted-foreground mt-0.5">{[s.customer_name, s.customer_phone].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                  <p className="font-bold tabular-nums shrink-0">{formatKES(s.amount)}</p>
                </div>
                <div className="mt-3">{rowActions(s)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-background rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-background">
              <h3 className="text-lg font-bold">{editing ? 'Edit' : 'Record'} service sale</h3>
              <button onClick={() => setShowForm(false)} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="ss-service">Service <span className="text-danger" aria-hidden="true">*</span></label>
                <select id="ss-service" className="input-field" value={form.service} onChange={e => pickService(e.target.value)}>
                  <option value="">Other / not listed…</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {!form.service && (
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="ss-name">Service name <span className="text-danger" aria-hidden="true">*</span></label>
                  <input id="ss-name" className="input-field" value={form.service_name} required
                    onChange={e => setForm(f => ({ ...f, service_name: e.target.value }))} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="ss-amount">Amount (KES) <span className="text-danger" aria-hidden="true">*</span></label>
                  <input id="ss-amount" type="number" min="1" step="any" className="input-field" value={form.amount} required
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="ss-pay">Payment <span className="text-danger" aria-hidden="true">*</span></label>
                  <select id="ss-pay" className="input-field" value={form.payment_method}
                    onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="ss-when">Date &amp; time served <span className="text-danger" aria-hidden="true">*</span></label>
                <input id="ss-when" type="datetime-local" className="input-field" value={form.served_at} required
                  onChange={e => setForm(f => ({ ...f, served_at: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="ss-cname">Customer (optional)</label>
                  <input id="ss-cname" className="input-field" value={form.customer_name}
                    onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="ss-cphone">Phone (optional)</label>
                  <input id="ss-cphone" type="tel" className="input-field" value={form.customer_phone}
                    onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="ss-notes">Notes (optional)</label>
                <textarea id="ss-notes" className="input-field min-h-[70px]" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              {error && <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">{error}</div>}
              <div className="flex gap-3 pt-2 pb-2">
                <button type="submit" disabled={saving} className="btn-modern btn-modern--primary flex-1 text-sm font-semibold">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-modern btn-modern--secondary flex-1 text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
