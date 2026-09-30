import { useEffect, useState } from 'react'
import { Gem, Scissors, Shirt, TrendingUp, CalendarCheck } from 'lucide-react'
import api from '@/lib/axios'
import { formatKES } from '@/lib/utils'
import StatCard from '@/components/admin/StatCard'
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
    { key: 'all', label: 'All Stores' },
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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Executive Dashboard</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={store} onChange={e => setStore(e.target.value as Store)} className="input-field !w-auto text-sm">
            {stores.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <div className="flex gap-1 border rounded-lg overflow-hidden">
            {periods.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${period === p.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading analytics…</div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label={store === 'all' ? 'Aggregate Revenue' : `${STORE_LABEL[store]} Revenue`}
              value={formatKES(scopedRevenue)}
              accent="text-primary"
            />
            <StatCard
              label="Total Net Profit"
              value={summary ? formatKES(summary.net_profit) : '—'}
              accent={summary && summary.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}
            />
            <div className="border rounded-xl p-5">
              <p className="text-sm text-muted-foreground">Top Performing Shop</p>
              <p className="text-2xl font-bold mt-1 flex items-center gap-2">
                <TopIcon size={18} className="text-primary" />
                {shopData?.top_shop ? STORE_LABEL[shopData.top_shop] : 'No revenue yet'}
              </p>
            </div>
            <StatCard
              label="Active Salon Bookings"
              value={String(shopData?.active_bookings ?? 0)}
              accent="text-primary"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="border rounded-xl p-5 lg:col-span-2">
              <h3 className="font-semibold mb-4">Sales Trend</h3>
              <SalesTrendChart data={trend} />
            </div>
            <div className="border rounded-xl p-5">
              <h3 className="font-semibold mb-1">Revenue by Shop</h3>
              <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                <CalendarCheck size={11} /> Beauty shows booking volume, not revenue — see note below.
              </p>
              {shopData && <ShopBreakdownChart totals={shopData.totals} height={180} />}
            </div>
          </div>

          <div className="border rounded-xl p-5">
            <h3 className="font-semibold mb-1">Inventory Health</h3>
            <p className="text-xs text-muted-foreground mb-4">Low-stock alerts across Products, Handbags and Clothes.</p>
            {alerts.length === 0 ? (
              <p className="text-sm text-green-600">All items are sufficiently stocked.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Item</th>
                      <th className="text-left px-4 py-2 font-medium">Type</th>
                      <th className="text-right px-4 py-2 font-medium">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map(item => (
                      <tr key={`${item.type}-${item.id}`} className="border-t">
                        <td className="px-4 py-2 font-medium">{item.name}</td>
                        <td className="px-4 py-2 capitalize text-muted-foreground">{item.type}</td>
                        <td className="px-4 py-2 text-right">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                            {item.stock_quantity} left
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
