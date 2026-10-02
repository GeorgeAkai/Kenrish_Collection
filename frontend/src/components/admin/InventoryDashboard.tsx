import { Link } from 'react-router-dom'
import { AlertTriangle, History, PackagePlus, ScanLine, ShoppingCart, Warehouse } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAdminQuery } from '@/lib/adminQuery'
import { formatKES } from '@/lib/utils'
import type { InventorySummary } from '@/lib/types'

interface CardSpec {
  key: string
  title: string
  icon: LucideIcon
  value: string
  sub: string
  tone?: 'alert' | 'calm'
}

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)

function cards(s: InventorySummary | null, failed: boolean): CardSpec[] {
  const pending = failed ? '–' : '…'
  return [
    {
      key: 'stock', title: 'Stock Overview', icon: Warehouse,
      value: s ? formatKES(s.stock_value) : pending, sub: s ? `${s.item_count} ${plural(s.item_count, 'item')}` : 'Everything you hold, at cost',
    },
    {
      key: 'add-stock', title: 'Add Stock', icon: PackagePlus,
      value: s ? (s.out_of_stock_count > 0 ? String(s.out_of_stock_count) : 'None') : pending,
      sub: s ? (s.out_of_stock_count > 0 ? 'out of stock' : 'Everything is in stock') : 'Record new stock coming in',
      tone: s && s.out_of_stock_count > 0 ? 'alert' : undefined,
    },
    {
      key: 'record-sale', title: 'Record Sale', icon: ShoppingCart,
      value: s ? formatKES(s.today_sales_total) : pending,
      sub: s ? `${s.today_sales_count} ${plural(s.today_sales_count, 'sale')} today` : 'Sell an item',
    },
    {
      key: 'sales', title: 'Sales History', icon: History,
      value: s ? String(s.month_sales_count) : pending,
      sub: s ? `${plural(s.month_sales_count, 'sale')} this month` : 'Review and correct sales',
    },
    { key: 'scan-receipt', title: 'Scan Receipt', icon: ScanLine, value: '', sub: 'Add stock from a supplier receipt' },
    {
      key: 'low-stock', title: 'Low Stock Alerts', icon: AlertTriangle,
      value: s ? (s.low_stock_count > 0 ? String(s.low_stock_count) : 'All stocked up') : pending,
      sub: s ? (s.low_stock_count > 0 ? `${plural(s.low_stock_count, 'item')} at or below reorder level` : 'Nothing needs reordering') : 'Items to reorder',
      tone: s ? (s.low_stock_count > 0 ? 'alert' : 'calm') : undefined,
    },
  ]
}

/** The Inventory landing page: one card per task, each with a live number, each opening its own page. */
export default function InventoryDashboard({ shop, basePath }: { shop?: 'beauty' | 'fashion'; basePath: string }) {
  // Kept between visits: coming back to the dashboard shows the last numbers at once, then updates them quietly.
  const q = useAdminQuery<InventorySummary>('/admin/inventory/summary/', { params: shop ? { shop } : {} })
  const summary = q.data ?? null
  const failed = q.isError && !summary

  return (
    <div className="space-y-4">
      {failed && <p role="status" className="text-sm text-amber-700">Could not load the latest numbers. The cards still work.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards(summary, failed).map(c => {
          const Icon = c.icon
          const alert = c.tone === 'alert'
          return (
            <Link
              key={c.key}
              to={`${basePath}/${c.key}`}
              aria-labelledby={`inv-${c.key}-title`}
              aria-describedby={`inv-${c.key}-desc`}
              data-tone={c.tone}
              className={`group block rounded-2xl border p-5 bg-card transition hover:shadow-md hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${alert ? 'border-red-300' : ''}`}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon size={16} className={alert ? 'text-red-600' : 'text-primary'} />
                <span id={`inv-${c.key}-title`}>{c.title}</span>
              </div>
              <div id={`inv-${c.key}-desc`}>
                {c.value && <p className={`mt-3 text-2xl font-semibold ${alert ? 'text-red-600' : ''}`}>{c.value}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
