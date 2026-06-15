import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import type { PieLabelRenderProps } from 'recharts'
import api from '@/lib/axios'
import { formatKES } from '@/lib/utils'
import type { GalleryImage } from '@/lib/types'
import { AlertTriangle, RotateCcw, Download } from 'lucide-react'

type Period = 'today' | 'week' | 'month'

interface Summary { revenue: number; expenses: number; net_profit: number }
interface TrendPoint { date: string; revenue: number }
interface TopSeller { name: string; type: string; units_sold: number }
interface Alert { id: number; name: string; type: string; stock_quantity: number; reorder_level: number }
interface ExpenseRow { category: string; total: number }
interface WishlistStat { name: string; type: string; wish_count: number }

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="border rounded-xl p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ?? ''}`}>{value}</p>
    </div>
  )
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6']

type ResetModal = null | 'confirm' | 'busy' | 'done'

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [topSellers, setTopSellers] = useState<TopSeller[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stockValue, setStockValue] = useState<number | null>(null)
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [resetModal, setResetModal] = useState<ResetModal>(null)
  const [resetMsg, setResetMsg] = useState('')

  async function handleReset(save: boolean) {
    setResetModal('busy')
    try {
      const { data } = await api.post('/admin/analytics/reset/', { save })
      if (save && data.snapshot) {
        const blob = new Blob([JSON.stringify(data.snapshot, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kenrish-analytics-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
      const d = data.deleted
      setResetMsg(`Cleared ${d.sales} sale${d.sales !== 1 ? 's' : ''}, ${d.expenses} expense${d.expenses !== 1 ? 's' : ''}, and ${d.cash_flow} cash-flow record${d.cash_flow !== 1 ? 's' : ''}.`)
      setResetModal('done')
      // Reload analytics
      setPeriod(p => p)
    } catch {
      setResetMsg('Reset failed. Please try again.')
      setResetModal('done')
    }
  }

  const [wishlistStats, setWishlistStats] = useState<WishlistStat[]>([])
  const [topLiked, setTopLiked] = useState<GalleryImage[]>([])
  const [engagementLoading, setEngagementLoading] = useState(true)

  // Main analytics — period-dependent
  useEffect(() => {
    setLoading(true)
    const p = `?period=${period}`
    Promise.all([
      api.get(`/admin/analytics/summary/${p}`),
      api.get(`/admin/analytics/sales-trend/${p}`),
      api.get(`/admin/analytics/top-sellers/${p}`),
      api.get('/admin/analytics/inventory-alerts/'),
      api.get('/admin/analytics/stock-value/'),
      api.get(`/admin/analytics/expenses-breakdown/${p}`),
    ]).then(([s, t, ts, a, sv, e]) => {
      setSummary(s.data)
      setTrend(t.data)
      const flat: TopSeller[] = [
        ...(ts.data.products ?? []),
        ...(ts.data.handbags ?? []),
        ...(ts.data.clothes ?? []),
      ].sort((a: TopSeller, b: TopSeller) => b.units_sold - a.units_sold).slice(0, 10)
      setTopSellers(flat)
      setAlerts(a.data)
      setStockValue(sv.data.total_value)
      setExpenses(e.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [period])

  // Engagement data — period-independent, fetched once
  useEffect(() => {
    setEngagementLoading(true)
    Promise.all([
      api.get('/admin/wishlist-stats/').catch(() => ({ data: [] })),
      api.get('/gallery/').catch(() => ({ data: [] })),
    ]).then(([ws, gl]) => {
      setWishlistStats(ws.data ?? [])
      const sorted: GalleryImage[] = [...(gl.data ?? [])]
        .sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))
        .filter(img => (img.like_count ?? 0) > 0)
        .slice(0, 10)
      setTopLiked(sorted)
    }).finally(() => setEngagementLoading(false))
  }, [])

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Analytics Dashboard</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 border rounded-lg overflow-hidden">
            {periods.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${period === p.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setResetModal('confirm')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
          >
            <RotateCcw size={14} /> Reset Dashboard
          </button>
        </div>
      </div>

      {/* ── Reset Modal ── */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            {resetModal === 'confirm' && (
              <>
                <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
                  <AlertTriangle size={22} />
                  <h3 className="text-lg font-semibold">Reset Analytics Dashboard?</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  This will permanently delete <strong>all sales, expense, and cash-flow records</strong>.
                  This action <strong>cannot be undone</strong>.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Choose <em>Save &amp; Reset</em> to download a JSON snapshot of current data before clearing,
                  or <em>Wipe</em> to clear immediately without saving.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleReset(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all"
                  >
                    <Download size={15} /> Save &amp; Reset
                  </button>
                  <button
                    onClick={() => handleReset(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border-2 border-red-500 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                  >
                    Wipe (No Save)
                  </button>
                  <button
                    onClick={() => setResetModal(null)}
                    className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
            {resetModal === 'busy' && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Resetting analytics…</p>
              </div>
            )}
            {resetModal === 'done' && (
              <>
                <h3 className="font-semibold mb-2">Reset Complete</h3>
                <p className="text-sm text-muted-foreground mb-4">{resetMsg}</p>
                <button
                  onClick={() => { setResetModal(null); setPeriod('month') }}
                  className="w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all"
                >
                  Close &amp; Refresh
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading analytics…</div>
      ) : (
        <div className="space-y-8">
          {/* KPI Cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Revenue" value={formatKES(summary.revenue)} accent="text-primary" />
              <StatCard label="Expenses" value={formatKES(summary.expenses)} />
              <StatCard label="Net Profit" value={formatKES(summary.net_profit)} accent={summary.net_profit >= 0 ? 'text-green-600' : 'text-red-600'} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Trend */}
            <div className="border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Revenue Trend</h3>
              {trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(Number(v)/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatKES(Number(v))} />
                    <Line type="monotone" dataKey="revenue" stroke="#6366f1" name="Revenue" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-10">No trend data for this period.</p>}
            </div>

            {/* Top Sellers */}
            <div className="border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Top Sellers (Units)</h3>
              {topSellers.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topSellers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip formatter={(v) => Number(v)} />
                    <Bar dataKey="units_sold" fill="#6366f1" name="Units Sold" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-10">No sales yet.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expenses Breakdown */}
            <div className="border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Expenses by Category</h3>
              {expenses.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={expenses} dataKey="total" nameKey="category" outerRadius={80}
                      label={(props: PieLabelRenderProps) => `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`}>
                      {expenses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(v) => formatKES(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-10">No expenses recorded.</p>}
            </div>

            {/* Stock Overview */}
            <div className="border rounded-xl p-5">
              <h3 className="font-semibold mb-2">Stock Overview</h3>
              {stockValue !== null && (
                <p className="text-2xl font-bold text-primary mb-4">
                  {formatKES(stockValue)}
                  <span className="text-sm font-normal text-muted-foreground ml-2">total stock value</span>
                </p>
              )}
              <h4 className="text-sm font-medium text-red-600 mb-2">Low Stock Alerts ({alerts.length})</h4>
              {alerts.length === 0 ? (
                <p className="text-sm text-green-600">All items are sufficiently stocked.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {alerts.map(item => (
                    <div key={`${item.type}-${item.id}`} className="flex items-center justify-between text-sm py-1 border-b">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs capitalize">({item.type})</span>
                      </div>
                      <span className="text-red-600 font-semibold">{item.stock_quantity} left</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Sellers Table */}
          {topSellers.length > 0 && (
            <div className="border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Top Sellers Detail</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Item</th>
                      <th className="text-left px-4 py-2 font-medium">Type</th>
                      <th className="text-right px-4 py-2 font-medium">Units Sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSellers.map((s, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2 font-medium">{s.name}</td>
                        <td className="px-4 py-2 capitalize text-muted-foreground">{s.type}</td>
                        <td className="px-4 py-2 text-right">{s.units_sold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Engagement — Most Wishlisted & Most Liked */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Customer Engagement</h3>
            {engagementLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Loading engagement data…</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Most Wishlisted */}
                <div className="border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Heart size={16} className="text-primary" fill="currentColor" />
                    <h4 className="font-semibold">Most Wishlisted Products</h4>
                  </div>
                  {wishlistStats.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">No wishlist activity yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {wishlistStats.map((s, i) => (
                        <div key={i} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{s.type}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Heart size={11} className="text-primary" fill="currentColor" />
                            <span className="text-sm font-semibold">{s.wish_count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Most Liked Gallery */}
                <div className="border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Heart size={16} className="text-rose-500" fill="currentColor" />
                    <h4 className="font-semibold">Most Liked Gallery Posts</h4>
                  </div>
                  {topLiked.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">No gallery likes yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {topLiked.map((img, i) => (
                        <div key={img.id} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}</span>
                          {!img.is_video && img.file && (
                            <img src={img.file} alt=""
                              className="w-10 h-10 rounded-lg object-cover shrink-0 bg-muted" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {img.description || (img.is_video ? 'Video' : 'Gallery image')}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">{img.service ?? 'general'}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Heart size={11} className="text-rose-500" fill="currentColor" />
                            <span className="text-sm font-semibold">{img.like_count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
