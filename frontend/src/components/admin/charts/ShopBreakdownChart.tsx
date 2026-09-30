import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { formatKES } from '@/lib/utils'

interface Props {
  totals: { beauty: number; fashion: number; luxury: number }
  height?: number
}

const SHOP_COLORS: Record<string, string> = {
  Beauty: 'var(--chart-1)',
  Fashion: 'var(--chart-2)',
  Luxury: 'var(--chart-3)',
}

export default function ShopBreakdownChart({ totals, height = 220 }: Props) {
  const data = [
    { shop: 'Beauty', revenue: totals.beauty },
    { shop: 'Fashion', revenue: totals.fashion },
    { shop: 'Luxury', revenue: totals.luxury },
  ]
  if (data.every(d => d.revenue === 0)) {
    return <p className="text-center text-muted-foreground py-10">No shop revenue recorded for this period yet.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="shop" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(Number(v) / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v) => formatKES(Number(v))} />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
          {data.map(d => <Cell key={d.shop} fill={SHOP_COLORS[d.shop]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
