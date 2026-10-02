import { useState, type FormEvent } from 'react'
import api from '@/lib/axios'
import { useAdminQuery } from '@/lib/adminQuery'
import { formatDateTime } from '@/lib/utils'
import type { Sale } from '@/lib/types'
import ModalShell from './ModalShell'

interface EditRecord {
  id: number
  editor_username: string
  created_at: string
  before: Record<string, string | number>
  after: Record<string, string | number>
}

const FIELD_LABELS: Record<string, string> = {
  quantity: 'Quantity', unit_price: 'Unit price', customer_name: 'Customer name', customer_phone: 'Customer phone',
}

const inputCls = 'w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring'

export default function EditSaleModal({ sale, onClose, onSaved }: {
  sale: Sale
  onClose: () => void
  onSaved: (sale: Sale) => void
}) {
  const [form, setForm] = useState({
    quantity: String(sale.quantity),
    unit_price: sale.unit_price,
    customer_name: sale.customer_name,
    customer_phone: sale.customer_phone,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Only sales that were corrected have a history; always re-read it when the dialog opens.
  const historyQuery = useAdminQuery<EditRecord[]>(`/admin/inventory/sales/${sale.id}/edits/`, { enabled: sale.edited, staleTime: 0 })
  const history = historyQuery.data ?? []

  // Send only what changed, so the audit trail records real corrections.
  const changes: Record<string, string | number> = {}
  if (Number(form.quantity) !== sale.quantity) changes.quantity = Number(form.quantity)
  if (Number(form.unit_price) !== Number(sale.unit_price)) changes.unit_price = form.unit_price
  if (form.customer_name !== sale.customer_name) changes.customer_name = form.customer_name
  if (form.customer_phone !== sale.customer_phone) changes.customer_phone = form.customer_phone

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { data } = await api.patch(`/admin/inventory/sales/${sale.id}/`, changes)
      onSaved(data)
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { detail?: string } } }).response?.data
      setError(data?.detail ?? 'Could not save the changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Edit sale" subtitle={sale.item_name} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="edit-sale-qty" className="block text-sm font-medium mb-1">Quantity</label>
          <input id="edit-sale-qty" type="number" min="1" className={inputCls} value={form.quantity}
            onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="edit-sale-price" className="block text-sm font-medium mb-1">Unit price (KES)</label>
          <input id="edit-sale-price" type="number" min="0" step="any" className={inputCls} value={form.unit_price}
            onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="edit-sale-name" className="block text-sm font-medium mb-1">Customer name</label>
          <input id="edit-sale-name" type="text" className={inputCls} value={form.customer_name}
            onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="edit-sale-phone" className="block text-sm font-medium mb-1">Customer phone</label>
          <input id="edit-sale-phone" type="tel" className={inputCls} value={form.customer_phone}
            onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving || Object.keys(changes).length === 0} className="btn-modern btn-modern--primary">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
      {history.length > 0 && (
        <section className="mt-6 max-w-md" aria-label="Edit history">
          <h4 className="text-sm font-semibold mb-2">Edit history</h4>
          <ul className="space-y-3">
            {history.map(h => (
              <li key={h.id} className="text-xs border rounded-md p-2">
                <p className="font-medium">{h.editor_username} · {formatDateTime(h.created_at)}</p>
                {Object.keys(FIELD_LABELS).filter(k => h.before[k] !== h.after[k]).map(k => (
                  <p key={k} className="text-muted-foreground">{FIELD_LABELS[k]}: {String(h.before[k] || '(blank)')} → {String(h.after[k] || '(blank)')}</p>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </ModalShell>
  )
}
