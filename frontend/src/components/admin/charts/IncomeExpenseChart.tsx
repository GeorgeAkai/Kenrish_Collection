import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatKES, formatChartDate } from '@/lib/utils'

export interface IncomeExpensePoint { date: string; revenue: number | string; expenses: number | string }

/** Income vs expenses per day (or per month for quarter/year periods). */
export default function IncomeExpenseChart({ data, height = 260 }: { data: IncomeExpensePoint[]; height?: number }) {
  const rows = data.map(d => ({ date: d.date, Income: Number(d.revenue), Expenses: Number(d.expenses) }))
  if (rows.length === 0) {
    return <p className="text-center text-muted-foreground py-10">No income or expenses recorded for this period.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={formatChartDate} minTickGap={28} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(Number(v) / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v) => formatKES(Number(v))} labelFormatter={l => formatChartDate(String(l))} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Income" fill="var(--success)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Expenses" fill="var(--danger)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
