import { useEffect, useState } from 'react'
import { Gem, Scissors, Shirt, TrendingUp, TrendingDown, CalendarCheck, Wallet, Store as StoreIcon, ChevronDown } from 'lucide-react'
import api from '@/lib/axios'
import { formatKESWhole } from '@/lib/utils'
import KpiCard from '@/components/admin/KpiCard'
import SalesTrendChart from '@/components/admin/charts/SalesTrendChart'
import ShopBreakdownChart from '@/components/admin/charts/ShopBreakdownChart'

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year'
type Store = 'all' | 'beauty' | 'fashion' | 'luxury'

interface Summary { revenue: number; expenses: number; net_profit: number }
interface TrendPoint { date: string; revenue: number }
interface ShopBreakdown { totals: { beauty: number; fashion: number; luxury: number }; top_shop: Store | null; active_bookings: number }
interface Alert { id: number; name: string; type: string; stock_quantity: number; reorder_level: number }

const STORE_ICON: Record<string, typeof Gem> = { beauty: Scissors, fashion: Shirt, luxury: Gem }
const STORE_LABEL: Record<string, string> = { beauty: 'Beauty', fashion: 'Fashion', luxury: 'Luxury' }

const panel = 'bg-card border border-border rounded-[20px] p-4 lg:p-6 shadow-card min-w-0'
const title = 'font-heading text-lg lg:text-xl font-semibold mb-4'

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

export default function AdminExecutiveDashboardPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [store, setStore] = useState<Store>('all')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [shopData, setShopData] = useState<ShopBreakdown | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const p = `?period=${period}`
    Promise.all([
      api.get<Summary>(`/admin/analytics/summary/${p}`),
      api.get<TrendPoint[]>(`/admin/analytics/sales-trend/${p}`),
      api.get<ShopBreakdown>(`/admin/analytics/shop-breakdown/${p}`),
      api.get<Alert[]>('/admin/analytics/inventory-alerts/'),
    ]).then(([s, t, sb, a]) => {
      setSummary(s.data)
      setTrend(t.data)
      setShopData(sb.data)
      setAlerts(a.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [period])

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'quarter', label: 'Quarter' },
    { key: 'year', label: 'Year' },
  ]
  const stores: { key: Store; label: string }[] = [
    { key: 'all', label: 'All Stores Overview' },
    { key: 'beauty', label: 'Beauty Admin' },
    { key: 'fashion', label: 'Fashion Admin' },
    { key: 'luxury', label: 'Luxury Admin' },
  ]

  const TopIcon = shopData?.top_shop ? STORE_ICON[shopData.top_shop] : TrendingUp
  // Aggregate Revenue sums CashFlow across all three shops (beauty+fashion+luxury),
  // not the Sale-only /admin/analytics/summary/ figure, which misses Luxury's
  // CashFlow-only "Mark Sold" revenue entirely.
  const aggregateRevenue = shopData ? shopData.totals.beauty + shopData.totals.fashion + shopData.totals.luxury : 0
  const scopedRevenue = shopData
    ? store === 'all' ? aggregateRevenue : shopData.totals[store as 'beauty' | 'fashion' | 'luxury']
    : 0

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-5 lg:mb-7 gap-4">
        <div>
          <p className="eyebrow mb-1.5">{stores.find(s => s.key === store)?.label}</p>
          <h2 className="font-heading text-[26px] lg:text-4xl font-semibold leading-tight">Executive overview</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="relative">
            <span className="sr-only">Store scope</span>
            <StoreIcon size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select value={store} onChange={e => setStore(e.target.value as Store)}
              className="appearance-none w-full sm:w-auto h-11 pl-10 pr-10 rounded-full border border-border-control bg-card text-sm font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {stores.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
          </label>
          <div role="radiogroup" aria-label="Period" className="grid grid-cols-5 p-1 rounded-full bg-secondary border border-border">
            {periods.map(p => (
              <button key={p.key} role="radio" aria-checked={period === p.key} onClick={() => setPeriod(p.key)}
                className={`h-9 px-2 sm:px-3.5 rounded-full text-[13px] sm:text-sm font-semibold whitespace-nowrap transition-colors ${period === p.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading analytics…</div>
      ) : (
        <div className="space-y-5 lg:space-y-7">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <KpiCard accent icon={Wallet}
              label={store === 'all' ? 'Aggregate revenue' : `${STORE_LABEL[store]} revenue`}
              value={formatKESWhole(scopedRevenue)}
            />
            <KpiCard
              icon={summary && summary.net_profit < 0 ? TrendingDown : TrendingUp}
              label="Total net profit"
              value={summary ? formatKESWhole(summary.net_profit) : '—'}
              tone={summary ? (summary.net_profit >= 0 ? 'up' : 'down') : undefined}
              hint={summary && summary.revenue > 0 ? `${Math.round((summary.net_profit / summary.revenue) * 100)}% margin` : undefined}
            />
            <KpiCard icon={TopIcon}
              label="Top performing shop"
              value={shopData?.top_shop ? STORE_LABEL[shopData.top_shop] : 'No revenue yet'}
            />
            <KpiCard icon={CalendarCheck}
              label="Active salon bookings"
              value={String(shopData?.active_bookings ?? 0)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
            <div className={`${panel} lg:col-span-2`}>
              <h3 className={title}>Sales trend</h3>
              <SalesTrendChart data={trend} />
            </div>
            <div className={panel}>
              <h3 className={title.replace('mb-4', 'mb-1')}>Revenue by shop</h3>
              <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                <CalendarCheck size={11} /> Beauty shows booking volume, not revenue — see note below.
              </p>
              {shopData && <ShopBreakdownChart totals={shopData.totals} height={180} />}
            </div>
          </div>

          <div className={panel}>
            <h3 className={title.replace('mb-4', 'mb-1')}>Inventory health</h3>
            <p className="text-xs text-muted-foreground mb-4">Low-stock alerts across Products, Handbags and Clothes.</p>
            {alerts.length === 0 ? (
              <p className="text-sm text-success">All items are sufficiently stocked.</p>
            ) : (
              <>
                {/* Table from 640px; stacked cards on phones */}
                <div className="hidden sm:block overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Item</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Type</th>
                        <th className="text-right px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Stock vs reorder</th>
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

          <p className="text-xs text-muted-foreground border-t border-border pt-4">
            Beauty has no automatic revenue capture yet — reservations don't generate a Sale/CashFlow record on
            completion, so "Top Performing Shop" and Revenue by Shop compare Fashion (in-store sales) and Luxury
            (Mark Sold inquiries) only. Beauty's contribution is shown as Active Salon Bookings instead.
            Total Net Profit still reflects Fashion sales minus expenses only, since Luxury revenue has no
            associated cost of goods recorded — treat it as a Fashion-scoped figure, not a true aggregate.
          </p>
        </div>
      )}
    </div>
  )
}
