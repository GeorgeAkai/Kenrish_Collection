import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatKES } from '@/lib/utils'

interface ShopTotals { beauty: number | string; fashion: number | string }

interface Props {
  totals: ShopTotals
  expenses?: ShopTotals
  height?: number
}

/** Income (and, when given, expenses) for Beauty next to Fashion. */
export default function ShopBreakdownChart({ totals, expenses, height = 220 }: Props) {
  const data = [
    { shop: 'Beauty', Income: Number(totals.beauty), Expenses: Number(expenses?.beauty ?? 0) },
    { shop: 'Fashion', Income: Number(totals.fashion), Expenses: Number(expenses?.fashion ?? 0) },
  ]
  if (data.every(d => d.Income === 0 && d.Expenses === 0)) {
    return <p className="text-center text-muted-foreground py-10">No shop activity recorded for this period yet.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="shop" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(Number(v) / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v) => formatKES(Number(v))} />
        {expenses && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        <Bar dataKey="Income" fill="var(--success)" radius={[4, 4, 0, 0]} />
        {expenses && <Bar dataKey="Expenses" fill="var(--danger)" radius={[4, 4, 0, 0]} />}
      </BarChart>
    </ResponsiveContainer>
  )
}
