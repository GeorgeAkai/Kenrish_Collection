import { useState, type FormEvent } from 'react'
import api from '@/lib/axios'
import { categoriesForShop, type ExpenseShop } from '@/lib/expenseCategories'
import { nairobiDateKey } from '@/lib/utils'
import type { Expense } from '@/lib/types'
import ModalShell from './ModalShell'

const inputCls = 'w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring'

/** The server's validation messages (or a fallback), flattened into one readable line. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } }).response?.data
  if (typeof data === 'string') return data
  if (data && typeof data === 'object') {
    const msgs = Object.values(data as Record<string, unknown>).flat().map(String)
    if (msgs.length) return msgs.join(' ')
  }
  return fallback
}

/**
 * Add or edit an expense. `shop` is set on a shop's own Expenses page (it decides where the cost is filed);
 * leave it out on the all-shops page, where the admin picks Beauty, Fashion or Shared.
 */
export default function ExpenseFormModal({ shop, expense, onClose, onSaved }: {
  shop?: ExpenseShop
  expense?: Expense
  onClose: () => void
  onSaved: (expense: Expense) => void
}) {
  const today = nairobiDateKey()
  const [form, setForm] = useState({
    description: expense?.description ?? '',
    amount: expense?.amount ?? '',
    category: expense?.category ?? categoriesForShop(shop)[0],
    shop: expense ? (expense.shop ?? '') : (shop ?? ''),
    date_purchased: expense?.date_purchased ?? today,
    note: expense?.note ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const effectiveShop = shop ?? ((form.shop || undefined) as ExpenseShop | undefined)
  const categories = categoriesForShop(effectiveShop, expense?.category)
  const pending = expense?.is_pending ?? false

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  // When editing, send only what changed so the audit trail shows real corrections.
  const changes: Record<string, string> = {}
  if (expense) {
    if (form.description !== expense.description) changes.description = form.description
    if (form.amount !== '' && Number(form.amount) !== Number(expense.amount ?? NaN)) changes.amount = form.amount
    if (form.category !== expense.category) changes.category = form.category
    if (form.shop !== (expense.shop ?? '')) changes.shop = form.shop
    if (form.date_purchased !== expense.date_purchased) changes.date_purchased = form.date_purchased
    if (form.note !== expense.note) changes.note = form.note
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { data } = expense
        ? await api.patch(`/admin/expenses/${expense.id}/`, changes)
        : await api.post('/admin/expenses/', {
            description: form.description, amount: form.amount, category: form.category,
            shop: shop ?? form.shop, date_purchased: form.date_purchased, note: form.note,
          })
      onSaved(data)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the expense.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title={expense ? 'Edit expense' : 'Add expense'} subtitle={pending ? 'Awaiting its bill: enter the amount to count it' : undefined} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="exp-desc" className="block text-sm font-medium mb-1">What was it for?</label>
          <input id="exp-desc" required className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div>
          <label htmlFor="exp-amount" className="block text-sm font-medium mb-1">
            {pending ? 'Bill amount (KES)' : 'Amount (total price if a bale)'}
          </label>
          <input id="exp-amount" type="number" required min="0.01" step="any" className={inputCls}
            value={form.amount} onChange={e => set('amount', e.target.value)} />
        </div>
        <div>
          <label htmlFor="exp-category" className="block text-sm font-medium mb-1">Category</label>
          <select id="exp-category" className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {!shop && (
          <div>
            <label htmlFor="exp-shop" className="block text-sm font-medium mb-1">Shop</label>
            <select id="exp-shop" className={inputCls} value={form.shop} onChange={e => set('shop', e.target.value)}>
              <option value="">Shared (both shops)</option>
              <option value="beauty">Beauty</option>
              <option value="fashion">Fashion</option>
            </select>
          </div>
        )}
        <div>
          <label htmlFor="exp-date" className="block text-sm font-medium mb-1">Date purchased</label>
          <input id="exp-date" type="date" required max={today} className={inputCls}
            value={form.date_purchased} onChange={e => set('date_purchased', e.target.value)} />
        </div>
        <div>
          <label htmlFor="exp-note" className="block text-sm font-medium mb-1">Note <span className="font-normal text-muted-foreground">(optional)</span></label>
          <textarea id="exp-note" rows={2} className={inputCls} value={form.note} onChange={e => set('note', e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving || (!!expense && Object.keys(changes).length === 0)} className="btn-modern btn-modern--primary">
          {saving ? 'Saving…' : 'Save expense'}
        </button>
      </form>
    </ModalShell>
  )
}
