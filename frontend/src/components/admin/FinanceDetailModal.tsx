import { useEffect, useState } from 'react'
import api from '@/lib/axios'
import { formatKES, formatChartDate, formatPeriodRange, NAIROBI_TZ } from '@/lib/utils'
import ModalShell from '@/components/admin/ModalShell'

export type FinanceKind = 'income' | 'expense' | 'net'
type Scope = 'all' | 'beauty' | 'fashion'

interface TxRow { id: number; date: string; description: string; category: string; shop: string; amount: string }
interface TxData { rows: TxRow[]; count: number; total: string; limit: number }
interface CashPoint { date: string; revenue: number | string; expenses: number | string }
interface ShopData { totals: { beauty: number | string; fashion: number | string }; expenses: { beauty: number | string; fashion: number | string } }
interface Summary { revenue: number | string; expenses: number | string; net_profit: number }

const th = 'px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground'
const SHOP_LABEL: Record<string, string> = { beauty: 'Beauty', fashion: 'Fashion', '': 'Shared' }
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: NAIROBI_TZ })
const signed = (n: number) => (n < 0 ? 'text-danger' : 'text-success')

const SCOPE_NAME: Record<Scope, string> = { all: 'All shops', beauty: 'Kenrish Beauty', fashion: 'Kenrish Fashion' }

/** The numbers behind the Income, Expenses and Net profit cards, with totals. */
export default function FinanceDetailModal({ kind, scope, period, summary, cashFlow, shopData, onClose }: {
  kind: FinanceKind
  scope: Scope
  period: string
  summary: Summary | null
  cashFlow: CashPoint[]
  shopData: ShopData | null
  onClose: () => void
}) {
  const [tx, setTx] = useState<TxData | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (kind === 'net') return
    const shop = scope === 'all' ? '' : `&shop=${scope}`
    api.get<TxData>(`/admin/analytics/transactions/?type=${kind}&period=${period}${shop}`)
      .then(r => setTx(r.data)).catch(() => setFailed(true))
  }, [kind, scope, period])

  const title = kind === 'income' ? 'Income' : kind === 'expense' ? 'Expenses' : 'Net profit'
  const range = `${SCOPE_NAME[scope]} · ${formatPeriodRange(period)}`

  if (kind === 'net') {
    const income = Number(summary?.revenue ?? 0)
    const expenses = Number(summary?.expenses ?? 0)
    const byShop = shopData ? [
      { label: 'Beauty', income: Number(shopData.totals.beauty), expenses: Number(shopData.expenses.beauty) },
      { label: 'Fashion', income: Number(shopData.totals.fashion), expenses: Number(shopData.expenses.fashion) },
      // Costs not tied to a shop only exist in the combined figure.
      { label: 'Shared costs', income: 0, expenses: Math.max(0, expenses - Number(shopData.expenses.beauty) - Number(shopData.expenses.fashion)) },
    ] : []
    return (
      <ModalShell title="Net profit" subtitle={`${range} · income − expenses`} onClose={onClose}>
        <div className="space-y-6">
          {scope === 'all' && byShop.length > 0 && (
            <NetTable heading="By shop" rows={byShop} income={income} expenses={expenses} />
          )}
          <NetTable
            heading="By date"
            rows={cashFlow.map(c => ({ label: formatChartDate(c.date), income: Number(c.revenue), expenses: Number(c.expenses) }))}
            income={income} expenses={expenses}
          />
        </div>
      </ModalShell>
    )
  }

  const showShop = scope === 'all'
  return (
    <ModalShell title={title} subtitle={`${range}${tx ? ` · ${tx.count} ${tx.count === 1 ? 'entry' : 'entries'}` : ''}`} onClose={onClose}>
      {failed ? (
        <p className="text-center text-danger py-10">Couldn’t load the details.</p>
      ) : !tx ? (
        <p className="text-center text-muted-foreground py-10">Loading…</p>
      ) : tx.rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">Nothing recorded for this period.</p>
      ) : (
        <>
          <div className="hidden sm:block rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className={`text-left ${th}`}>Date</th>
                  <th className={`text-left ${th}`}>Description</th>
                  <th className={`text-left ${th}`}>{kind === 'income' ? 'Type' : 'Category'}</th>
                  {showShop && <th className={`text-left ${th}`}>Shop</th>}
                  <th className={`text-right ${th}`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {tx.rows.map(r => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{fmtDate(r.date)}</td>
                    <td className="px-4 py-2.5">{r.description}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.category}</td>
                    {showShop && <td className="px-4 py-2.5 text-muted-foreground">{SHOP_LABEL[r.shop] ?? r.shop}</td>}
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatKES(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-secondary/60 border-t border-border font-bold">
                <tr>
                  <td colSpan={showShop ? 4 : 3} className="px-4 py-2.5">Total ({tx.count} {tx.count === 1 ? 'entry' : 'entries'})</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatKES(tx.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <ul className="sm:hidden space-y-2">
            {tx.rows.map(r => (
              <li key={r.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold min-w-0">{r.description}</p>
                  <p className="text-sm font-bold tabular-nums shrink-0">{formatKES(r.amount)}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {fmtDate(r.date)} · {r.category}{showShop ? ` · ${SHOP_LABEL[r.shop] ?? r.shop}` : ''}
                </p>
              </li>
            ))}
            <li className="rounded-xl bg-secondary/60 p-3 flex justify-between text-sm font-bold">
              <span>Total · {tx.count} {tx.count === 1 ? 'entry' : 'entries'}</span>
              <span className="tabular-nums">{formatKES(tx.total)}</span>
            </li>
          </ul>
          {tx.count > tx.rows.length && (
            <p className="text-xs text-muted-foreground mt-3">
              Showing the latest {tx.rows.length} of {tx.count} entries. The total includes all {tx.count}.
            </p>
          )}
        </>
      )}
    </ModalShell>
  )
}

function NetTable({ heading, rows, income, expenses }: {
  heading: string
  rows: { label: string; income: number; expenses: number }[]
  income: number
  expenses: number
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">{heading}</h4>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Nothing recorded for this period.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className={`text-left ${th}`}>{heading === 'By shop' ? 'Shop' : 'Date'}</th>
                <th className={`text-right ${th}`}>Income</th>
                <th className={`text-right ${th}`}>Expenses</th>
                <th className={`text-right ${th}`}>Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.label} className="border-t border-border">
                  <td className="px-4 py-2.5 whitespace-nowrap">{r.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatKES(r.income)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatKES(r.expenses)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${signed(r.income - r.expenses)}`}>{formatKES(r.income - r.expenses)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-secondary/60 border-t border-border font-bold">
              <tr>
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatKES(income)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatKES(expenses)}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${signed(income - expenses)}`}>{formatKES(income - expenses)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
