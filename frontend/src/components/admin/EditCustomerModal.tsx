import { useState, type FormEvent } from 'react'
import api from '@/lib/axios'
import { apiErrorMessage } from './ExpenseFormModal'
import ModalShell from './ModalShell'

const inputCls = 'w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring'

/** Correct a customer's name or phone. Their purchase history stays with them; every change is audited. */
export default function EditCustomerModal({ customerId, name, phone, onClose, onSaved }: {
  customerId: number
  name: string
  phone: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({ name, phone })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const changes: Record<string, string> = {}
  if (form.name !== name) changes.name = form.name
  if (form.phone !== phone) changes.phone = form.phone

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.patch(`/admin/customers/customer/${customerId}/`, changes)
      onSaved()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the contact details.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Edit contact details" subtitle="Their purchases stay with them" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="cust-name" className="block text-sm font-medium mb-1">Name</label>
          <input id="cust-name" className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="cust-phone" className="block text-sm font-medium mb-1">Phone</label>
          <input id="cust-phone" type="tel" required className={inputCls} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving || Object.keys(changes).length === 0} className="btn-modern btn-modern--primary">
          {saving ? 'Saving…' : 'Save contact'}
        </button>
      </form>
    </ModalShell>
  )
}
