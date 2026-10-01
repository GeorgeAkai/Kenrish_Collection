import { useEffect, useState, type ReactNode } from 'react'
import { Scissors, Shirt, TrendingUp, TrendingDown, CalendarCheck, Wallet, Receipt, Boxes } from 'lucide-react'
import api from '@/lib/axios'
import { formatKESWhole, formatPeriodRange } from '@/lib/utils'
import KpiCard from '@/components/admin/KpiCard'
import SalesTrendChart from '@/components/admin/charts/SalesTrendChart'
import ExpensesPieChart, { type ExpenseRow } from '@/components/admin/charts/ExpensesPieChart'
import IncomeExpenseChart, { type IncomeExpensePoint } from '@/components/admin/charts/IncomeExpenseChart'
import ShopBreakdownChart from '@/components/admin/charts/ShopBreakdownChart'

export type Scope = 'all' | 'beauty' | 'fashion'
type Period = 'today' | 'week' | 'month' | 'quarter' | 'year'

interface Summary { revenue: number; expenses: number; net_profit: number }
interface TrendPoint { date: string; revenue: number }
interface Seller { name: string; type: string; units_sold: number }
interface Alert { id: number; name: string; type: string; stock_quantity: number; reorder_level: number }
interface ShopBreakdown {
  totals: { beauty: number; fashion: number }
  expenses: { beauty: number; fashion: number }
  top_shop: 'beauty' | 'fashion' | null
  active_bookings: number
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
]

const SCOPE_LABEL: Record<Scope, string> = { all: 'All shops', beauty: 'Kenrish Beauty', fashion: 'Kenrish Fashion' }
const SHOP_LABEL = { beauty: 'Beauty', fashion: 'Fashion' }
const SHOP_ICON = { beauty: Scissors, fashion: Shirt }

const panel = 'bg-card border border-border rounded-[20px] p-4 lg:p-6 shadow-card min-w-0'
const heading = 'font-heading text-lg lg:text-xl font-semibold mb-4'
const th = 'px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground'

/** Stock badge: always a word, never colour alone. */
function StockPill({ item }: { item: Alert }) {
  const out = item.stock_quantity <= 0
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-bold whitespace-nowrap ${out ? 'bg-danger-tint text-danger' : 'bg-warning-tint text-warning'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {out ? 'Sold out' : `${item.stock_quantity} / ${item.reorder_level} left`}
    </span>
  )
}

/**
 * The analytics dashboard body. `scope="all"` is the combined Executive view;
 * `beauty` / `fashion` narrow every figure and chart to that shop.
 */
export default function AnalyticsView({ scope, title, actions }: { scope: Scope; title: string; actions?: ReactNode }) {
  const [period, setPeriod] = useState<Period>('month')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [cashFlow, setCashFlow] = useState<IncomeExpensePoint[]>([])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stockValue, setStockValue] = useState(0)
  const [shopData, setShopData] = useState<ShopBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    const shop = scope === 'all' ? '' : `&shop=${scope}`
    const p = `?period=${period}${shop}`
    const s = scope === 'all' ? '' : `?shop=${scope}`
    Promise.all([
      api.get<Summary>(`/admin/analytics/summary/${p}`),
      api.get<TrendPoint[]>(`/admin/analytics/sales-trend/${p}`),
      api.get<IncomeExpensePoint[]>(`/admin/analytics/cash-flow/${p}`),
      api.get<ExpenseRow[]>(`/admin/analytics/expenses-breakdown/${p}`),
      api.get<Record<'products' | 'handbags' | 'clothes' | 'services', Seller[]>>(`/admin/analytics/top-sellers/${p}`),
      api.get<Alert[]>(`/admin/analytics/inventory-alerts/${s}`),
      api.get<{ total_value: number }>(`/admin/analytics/stock-value/${s}`),
      api.get<ShopBreakdown>(`/admin/analytics/shop-breakdown/?period=${period}`),
    ]).then(([sm, tr, cf, ex, ts, al, sv, sb]) => {
      setSummary(sm.data)
      setTrend(tr.data)
      setCashFlow(cf.data)
      setExpenses(ex.data)
      setSellers([...ts.data.products, ...ts.data.handbags, ...ts.data.clothes, ...ts.data.services]
        .sort((a, b) => b.units_sold - a.units_sold).slice(0, 8))
      setAlerts(al.data)
      setStockValue(Number(sv.data.total_value))
      setShopData(sb.data)
    }).catch(err => { console.error(err); setError(true) }).finally(() => setLoading(false))
  }, [period, scope])

  const net = summary?.net_profit ?? 0
  const margin = summary && summary.revenue > 0 ? `${Math.round((net / Number(summary.revenue)) * 100)}% margin` : undefined

  let fourth: { label: string; value: string; icon: typeof Wallet }
  if (scope === 'beauty') {
    fourth = { label: 'Active salon bookings', value: String(shopData?.active_bookings ?? 0), icon: CalendarCheck }
  } else if (scope === 'fashion') {
    fourth = { label: 'Stock value (at cost)', value: formatKESWhole(stockValue), icon: Boxes }
  } else {
    fourth = {
      label: 'Top performing shop',
      value: shopData?.top_shop ? SHOP_LABEL[shopData.top_shop] : 'No revenue yet',
      icon: shopData?.top_shop ? SHOP_ICON[shopData.top_shop] : TrendingUp,
    }
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-5 lg:mb-7 gap-4">
        <div>
          <p className="eyebrow mb-1.5">{SCOPE_LABEL[scope]}</p>
          <h2 className="font-heading text-[26px] lg:text-4xl font-semibold leading-tight">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1.5 tabular-nums">{formatPeriodRange(period)}</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div role="radiogroup" aria-label="Period" className="grid grid-cols-5 p-1 rounded-full bg-secondary border border-border">
            {PERIODS.map(pp => (
              <button key={pp.key} role="radio" aria-checked={period === pp.key} onClick={() => setPeriod(pp.key)}
                className={`h-9 px-2 sm:px-3.5 rounded-full text-[13px] sm:text-sm font-semibold whitespace-nowrap transition-colors ${period === pp.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {pp.label}
              </button>
            ))}
          </div>
          {actions}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading analytics…</div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-danger">Couldn’t load analytics. Please refresh.</div>
      ) : (
        <div className="space-y-5 lg:space-y-7">
          <div className={`grid grid-cols-2 gap-3 lg:gap-4 ${scope === 'beauty' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
            <KpiCard accent icon={Wallet} label="Income" value={formatKESWhole(summary?.revenue ?? 0)} />
            <KpiCard icon={Receipt} label="Expenses" value={formatKESWhole(summary?.expenses ?? 0)} hint="Stock purchases & other costs" />
            <KpiCard
              icon={net < 0 ? TrendingDown : TrendingUp}
              label="Net profit"
              value={formatKESWhole(net)}
              tone={net >= 0 ? 'up' : 'down'}
              hint={margin}
            />
            <KpiCard icon={fourth.icon} label={fourth.label} value={fourth.value} />
            {scope === 'beauty' && (
              <KpiCard icon={Boxes} label="Stock value (at cost)" value={formatKESWhole(stockValue)} hint="Beauty products on hand" />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
            <div className={`${panel} lg:col-span-2`}>
              <h3 className={heading}>Income vs expenses</h3>
              <IncomeExpenseChart data={cashFlow} />
            </div>
            <div className={panel}>
              <h3 className={heading}>Expenses by category</h3>
              <ExpensesPieChart data={expenses} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
            <div className={`${panel} lg:col-span-2`}>
              <h3 className={heading}>Income trend</h3>
              <SalesTrendChart data={trend} />
            </div>
            {scope === 'all' && shopData ? (
              <div className={panel}>
                <h3 className={heading}>Beauty vs Fashion</h3>
                <ShopBreakdownChart totals={shopData.totals} expenses={shopData.expenses} height={220} />
              </div>
            ) : (
              <div className={panel}>
                <h3 className={heading}>Top sellers</h3>
                <SellersList sellers={sellers} />
              </div>
            )}
          </div>

          {scope === 'all' && (
            <div className={panel}>
              <h3 className={heading}>Top sellers</h3>
              <SellersList sellers={sellers} />
            </div>
          )}

          <div className={panel}>
            <h3 className={heading.replace('mb-4', 'mb-1')}>Inventory health</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Low-stock alerts{scope === 'all' ? ' across Beauty and Fashion' : ` for ${SCOPE_LABEL[scope]}`}.
            </p>
            {alerts.length === 0 ? (
              <p className="text-sm text-success">All items are sufficiently stocked.</p>
            ) : (
              <>
                <div className="hidden sm:block overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary">
                      <tr>
                        <th className={`text-left ${th}`}>Item</th>
                        <th className={`text-left ${th}`}>Type</th>
                        <th className={`text-right ${th}`}>Stock vs reorder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.map(item => (
                        <tr key={`${item.type}-${item.id}`} className="border-t border-border hover:bg-gold-tint/60">
                          <td className="px-4 py-3 font-semibold">{item.name}</td>
                          <td className="px-4 py-3 capitalize text-muted-foreground">{item.type}</td>
                          <td className="px-4 py-3 text-right"><StockPill item={item} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="sm:hidden space-y-2">
                  {alerts.map(item => (
                    <li key={`${item.type}-${item.id}`} className="rounded-xl border border-border p-3 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item.type} · reorder at {item.reorder_level}</p>
                      </div>
                      <StockPill item={item} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SellersList({ sellers }: { sellers: Seller[] }) {
  if (sellers.length === 0) return <p className="text-center text-muted-foreground py-10">No sales in this period yet.</p>
  return (
    <ul className="divide-y divide-border">
      {sellers.map((s, i) => (
        <li key={`${s.type}-${s.name}-${i}`} className="flex items-center gap-3 py-2.5">
          <span className="w-5 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{s.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{s.type}</p>
          </div>
          <span className="text-sm font-bold tabular-nums">
            {s.units_sold}<span className="text-xs font-normal text-muted-foreground"> {s.type === 'service' ? 'booked' : 'sold'}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
