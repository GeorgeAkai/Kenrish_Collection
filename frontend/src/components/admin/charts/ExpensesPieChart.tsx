import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { PieLabelRenderProps } from 'recharts'
import { formatKES } from '@/lib/utils'

export interface ExpenseRow { category: string; total: number | string }

const SLICE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

/** Expenses split by category. Slices are labelled with name + share, never colour alone. */
export default function ExpensesPieChart({ data, height = 240 }: { data: ExpenseRow[]; height?: number }) {
  const rows = data.map(d => ({ category: d.category, total: Number(d.total) })).filter(d => d.total > 0)
  if (rows.length === 0) {
    return <p className="text-center text-muted-foreground py-10">No expenses recorded for this period.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={rows} dataKey="total" nameKey="category" outerRadius="70%" stroke="var(--card)"
          label={(props: PieLabelRenderProps) => `${((props.percent ?? 0) * 100).toFixed(0)}%`}>
          {rows.map((_, i) => <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />)}
        </Pie>
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => formatKES(Number(v))} />
      </PieChart>
    </ResponsiveContainer>
  )
}
