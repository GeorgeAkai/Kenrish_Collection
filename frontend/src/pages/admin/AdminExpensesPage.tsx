import { useState } from 'react'
import { History, Pause, Pencil, Play, Plus, Repeat, Trash2 } from 'lucide-react'
import api from '@/lib/axios'
import { useAdminQuery, useInvalidateAdmin } from '@/lib/adminQuery'
import { categoriesForShop, type ExpenseShop } from '@/lib/expenseCategories'
import { formatDate, formatKES } from '@/lib/utils'
import type { Expense, ExpenseList, RecurringExpense } from '@/lib/types'
import AuditHistoryModal from '@/components/admin/AuditHistoryModal'
import ExpenseFormModal from '@/components/admin/ExpenseFormModal'
import RecurringExpenseFormModal from '@/components/admin/RecurringExpenseFormModal'
import InlineConfirm from '@/components/InlineConfirm'
import { useConfirm } from '@/hooks/useConfirm'
import { useToast } from '@/contexts/ToastContext'

const SHOP_LABEL: Record<string, string> = { beauty: 'Beauty', fashion: 'Fashion' }
const iconBtn = 'w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors'
const filterCls = 'border rounded-md px-2.5 py-1.5 text-sm bg-background'

function ShopBadge({ shop }: { shop: string | null }) {
  return (
    <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[11px] font-medium">
      {shop ? SHOP_LABEL[shop] : 'Shared'}
    </span>
  )
}

/**
 * Expenses for one shop (`shop` set), or for everything including shared costs such as rent (`shop` unset,
 * used from the Executive menu). Recurring costs live at the bottom of the same page.
 */
export default function AdminExpensesPage({ shop }: { shop?: ExpenseShop }) {
  const toast = useToast()
  const [category, setCategory] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expenseForm, setExpenseForm] = useState<{ expense?: Expense } | null>(null)
  const [recurringForm, setRecurringForm] = useState<{ template?: RecurringExpense } | null>(null)
  const [history, setHistory] = useState<Expense | null>(null)
  const delExpense = useConfirm<number>()
  const delTemplate = useConfirm<number>()

  const params: Record<string, string> = {}
  if (shop) params.shop = shop
  if (category) params.category = category
  if (dateFrom) params.date_from = dateFrom
  if (dateTo) params.date_to = dateTo
  // Each filter combination is remembered. Opening the list also posts this month's recurring entries.
  const data = useAdminQuery<ExpenseList>('/admin/expenses/', { params }).data ?? null
  const templates = useAdminQuery<RecurringExpense[]>('/admin/recurring-expenses/').data
  const shopTemplates = (templates ?? []).filter(t => !shop || t.shop === shop)
  const refresh = useInvalidateAdmin()

  async function removeExpense(id: number) {
    delExpense.cancel()
    try {
      await api.delete(`/admin/expenses/${id}/`)
      refresh()
    } catch {
      toast.error('Could not delete the expense.')
    }
  }

  async function togglePaused(t: RecurringExpense) {
    try {
      await api.patch(`/admin/recurring-expenses/${t.id}/`, { active: !t.active })
      refresh()
    } catch {
      toast.error('Could not update the recurring expense.')
    }
  }

  async function removeTemplate(id: number) {
    delTemplate.cancel()
    try {
      await api.delete(`/admin/recurring-expenses/${id}/`)
      refresh()
    } catch {
      toast.error('Could not delete the recurring expense.')
    }
  }

  const title = shop ? `${SHOP_LABEL[shop]} Expenses` : 'Expense Management'
  const pending = data?.pending_count ?? 0

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {shop ? 'What this shop has bought and paid for.' : 'Every cost across both shops, including shared ones such as rent.'}
          </p>
        </div>
        <button onClick={() => setExpenseForm({})} className="btn-modern btn-modern--primary flex items-center gap-1.5">
          <Plus size={16} /> Add expense
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border rounded-xl p-4 bg-card">
          <p className="text-xs text-muted-foreground">Total{category || dateFrom || dateTo ? ' (filtered)' : ''}</p>
          <p className="text-2xl font-semibold">{formatKES(data?.total ?? 0)}</p>
          <p className="text-xs text-muted-foreground">{data ? `${data.count} expense${data.count === 1 ? '' : 's'}` : ''}</p>
        </div>
        {pending > 0 && (
          <div role="status" className="border border-amber-300 bg-amber-50 text-amber-900 rounded-xl p-4 text-sm">
            <p className="font-medium">{pending} bill{pending === 1 ? '' : 's'} awaiting {pending === 1 ? 'its' : 'their'} amount</p>
            <p className="text-xs mt-1">These are not counted in totals until you enter the amount from the bill.</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select aria-label="Filter by category" className={filterCls} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categoriesForShop(shop).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" aria-label="From date" className={filterCls} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" aria-label="To date" className={filterCls} value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </div>

      <ul className="space-y-2">
        {data && data.results.length === 0 && <li className="py-10 text-center text-sm text-muted-foreground">No expenses recorded yet.</li>}
        {data?.results.map(e => (
          <li key={e.id} className="border rounded-xl p-3 bg-card flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex-1 min-w-[12rem]">
              <p className="font-medium text-sm">{e.description}</p>
              <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2">
                <span>{formatDate(e.date_purchased)}</span>
                <span>{e.category}</span>
                {!shop && <ShopBadge shop={e.shop} />}
                {e.recurring && <span className="inline-flex items-center gap-0.5"><Repeat size={11} /> recurring</span>}
              </p>
              {e.note && <p className="text-xs text-muted-foreground mt-0.5">{e.note}</p>}
            </div>
            <div className="text-right min-w-[8rem]">
              {e.is_pending ? (
                <>
                  <p className="text-sm font-medium text-amber-700">Awaiting amount</p>
                  <button onClick={() => setExpenseForm({ expense: e })} aria-label={`Enter amount for ${e.description}`}
                    className="text-xs text-primary hover:underline">Enter amount</button>
                </>
              ) : <p className="font-semibold text-sm">{formatKES(e.amount ?? 0)}</p>}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setHistory(e)} aria-label={`History of ${e.description}`} className={iconBtn}><History size={13} /></button>
              <button onClick={() => setExpenseForm({ expense: e })} aria-label={`Edit ${e.description}`} className={iconBtn}><Pencil size={13} /></button>
              {delExpense.isAsking(e.id)
                ? <InlineConfirm onConfirm={() => removeExpense(e.id)} onCancel={delExpense.cancel} />
                : <button onClick={() => delExpense.ask(e.id)} aria-label={`Delete ${e.description}`} className={`${iconBtn} text-red-600`}><Trash2 size={13} /></button>}
            </div>
          </li>
        ))}
      </ul>

      <section aria-label="Recurring expenses" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Recurring expenses</h3>
            <p className="text-sm text-muted-foreground">Costs that come every month. They are added automatically on the 1st.</p>
          </div>
          <button onClick={() => setRecurringForm({})} className="btn-modern flex items-center gap-1.5"><Plus size={16} /> Add recurring</button>
        </div>
        <ul className="space-y-2">
          {shopTemplates.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No recurring expenses yet.</li>}
          {shopTemplates.map(t => (
            <li key={t.id} className={`border rounded-xl p-3 bg-card flex flex-wrap items-center gap-x-4 gap-y-2 ${t.active ? '' : 'opacity-60'}`}>
              <div className="flex-1 min-w-[12rem]">
                <p className="font-medium text-sm">{t.name} {!t.active && <span className="ml-1 text-xs text-muted-foreground">(paused)</span>}</p>
                <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2"><span>{t.category}</span>{!shop && <ShopBadge shop={t.shop} />}</p>
              </div>
              <p className="text-sm font-medium">{t.kind === 'fixed' ? `${formatKES(t.amount ?? 0)} / month` : 'Amount varies'}</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => togglePaused(t)} aria-label={`${t.active ? 'Pause' : 'Resume'} ${t.name}`} className={iconBtn}>
                  {t.active ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button onClick={() => setRecurringForm({ template: t })} aria-label={`Edit ${t.name}`} className={iconBtn}><Pencil size={13} /></button>
                {delTemplate.isAsking(t.id)
                  ? <InlineConfirm onConfirm={() => removeTemplate(t.id)} onCancel={delTemplate.cancel} />
                  : <button onClick={() => delTemplate.ask(t.id)} aria-label={`Delete ${t.name}`} className={`${iconBtn} text-red-600`}><Trash2 size={13} /></button>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {expenseForm && (
        <ExpenseFormModal shop={shop} expense={expenseForm.expense} onClose={() => setExpenseForm(null)}
          onSaved={() => { setExpenseForm(null); refresh() }} />
      )}
      {recurringForm && (
        <RecurringExpenseFormModal shop={shop} template={recurringForm.template} onClose={() => setRecurringForm(null)}
          onSaved={() => { setRecurringForm(null); refresh() }} />
      )}
      {history && <AuditHistoryModal kind="expense" objectRef={history.id} title={history.description} onClose={() => setHistory(null)} />}
    </div>
  )
}
