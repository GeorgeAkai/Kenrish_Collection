import { useState, type FormEvent } from 'react'
import api from '@/lib/axios'
import { categoriesForShop, type ExpenseShop } from '@/lib/expenseCategories'
import { nairobiDateKey } from '@/lib/utils'
import type { RecurringExpense } from '@/lib/types'
import { apiErrorMessage } from './ExpenseFormModal'
import ModalShell from './ModalShell'

const inputCls = 'w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring'

/** A cost that repeats monthly. Fixed ones post themselves; variable ones wait for the bill's amount. */
export default function RecurringExpenseFormModal({ shop, template, onClose, onSaved }: {
  shop?: ExpenseShop
  template?: RecurringExpense
  onClose: () => void
  onSaved: (template: RecurringExpense) => void
}) {
  const thisMonth = nairobiDateKey().slice(0, 8) + '01'
  const [form, setForm] = useState({
    name: template?.name ?? '',
    category: template?.category ?? categoriesForShop(shop)[0],
    shop: template ? (template.shop ?? '') : (shop ?? ''),
    kind: template?.kind ?? 'fixed',
    amount: template?.amount ?? '',
    start_date: template?.start_date ?? thisMonth,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const effectiveShop = shop ?? ((form.shop || undefined) as ExpenseShop | undefined)
  const categories = categoriesForShop(effectiveShop, template?.category)
  const fixed = form.kind === 'fixed'

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const changes: Record<string, string> = {}
  if (template) {
    if (form.name !== template.name) changes.name = form.name
    if (form.category !== template.category) changes.category = form.category
    if (form.shop !== (template.shop ?? '')) changes.shop = form.shop
    if (form.kind !== template.kind) changes.kind = form.kind
    if (fixed && form.amount !== '' && Number(form.amount) !== Number(template.amount ?? NaN)) changes.amount = form.amount
    if (form.start_date !== template.start_date) changes.start_date = form.start_date
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { data } = template
        ? await api.patch(`/admin/recurring-expenses/${template.id}/`, changes)
        : await api.post('/admin/recurring-expenses/', {
            name: form.name, category: form.category, shop: shop ?? form.shop, kind: form.kind,
            ...(fixed ? { amount: form.amount } : {}), start_date: form.start_date,
          })
      onSaved(data)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the recurring expense.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title={template ? 'Edit recurring expense' : 'Add recurring expense'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="rec-name" className="block text-sm font-medium mb-1">What repeats?</label>
          <input id="rec-name" required className={inputCls} placeholder="e.g. Monthly rent" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label htmlFor="rec-category" className="block text-sm font-medium mb-1">Category</label>
          <select id="rec-category" className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {!shop && (
          <div>
            <label htmlFor="rec-shop" className="block text-sm font-medium mb-1">Shop</label>
            <select id="rec-shop" className={inputCls} value={form.shop} onChange={e => set('shop', e.target.value)}>
              <option value="">Shared (both shops)</option>
              <option value="beauty">Beauty</option>
              <option value="fashion">Fashion</option>
            </select>
          </div>
        )}
        <div>
          <label htmlFor="rec-kind" className="block text-sm font-medium mb-1">How much is it?</label>
          <select id="rec-kind" className={inputCls} value={form.kind} onChange={e => set('kind', e.target.value)}>
            <option value="fixed">The same every month (e.g. rent)</option>
            <option value="variable">Changes every month (e.g. electricity)</option>
          </select>
        </div>
        {fixed ? (
          <div>
            <label htmlFor="rec-amount" className="block text-sm font-medium mb-1">Monthly amount (KES)</label>
            <input id="rec-amount" type="number" required min="0.01" step="any" className={inputCls} value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            It is added on the 1st of each month as "awaiting amount". Enter the amount each month when the bill arrives.
          </p>
        )}
        <div>
          <label htmlFor="rec-start" className="block text-sm font-medium mb-1">First month</label>
          <input id="rec-start" type="date" required className={inputCls} value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving || (!!template && Object.keys(changes).length === 0)} className="btn-modern btn-modern--primary">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </ModalShell>
  )
}
