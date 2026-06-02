import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import type { PieLabelRenderProps } from 'recharts'
import api from '@/lib/axios'
import { formatKES } from '@/lib/utils'

type Period = 'today' | 'week' | 'month'

interface Summary { revenue: number; expenses: number; net_profit: number }
interface TrendPoint { date: string; revenue: number }
interface TopSeller { name: string; type: string; units_sold: number }
interface Alert { id: number; name: string; type: string; stock_quantity: number; reorder_level: number }
interface ExpenseRow { category: string; total: number }

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="border rounded-xl p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ?? ''}`}>{value}</p>
    </div>
  )
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6']

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [topSellers, setTopSellers] = useState<TopSeller[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stockValue, setStockValue] = useState<number | null>(null)
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [loading, setLoading] = useState(true)

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
      // top sellers comes as {products, handbags, clothes} — flatten
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

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Analytics Dashboard</h2>
        <div className="flex gap-1 border rounded-lg overflow-hidden">
          {periods.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${period === p.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

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
                    <Pie
                      data={expenses}
                      dataKey="total"
                      nameKey="category"
                      outerRadius={80}
                      label={(props: PieLabelRenderProps) => `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`}
                    >
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
        </div>
      )}
    </div>
  )
}
