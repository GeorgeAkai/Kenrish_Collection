import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatKES } from '@/lib/utils'

interface TrendPoint { date: string; revenue: number }

export default function SalesTrendChart({ data, height = 220 }: { data: TrendPoint[]; height?: number }) {
  if (data.length === 0) {
    return <p className="text-center text-muted-foreground py-10">No trend data for this period.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(Number(v) / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v) => formatKES(Number(v))} />
        <Line type="monotone" dataKey="revenue" stroke="var(--chart-1)" name="Revenue" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
