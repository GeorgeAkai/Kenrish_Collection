import { useAdminQuery } from '@/lib/adminQuery'
import { formatKES, formatKESWhole } from '@/lib/utils'
import ModalShell from '@/components/admin/ModalShell'

interface Row { id: number; name: string; type: string; units: number; cost_price: string; price: string; value: string }
interface Breakdown { items: Row[]; total_units: number; total_value: string }

const th = 'px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground'

/** Every stocked item with its units and prices, so the stock-value figure can be traced. */
export default function StockBreakdownModal({ shop, title, onClose }: { shop?: 'beauty' | 'fashion'; title: string; onClose: () => void }) {
  const query = useAdminQuery<Breakdown>('/admin/analytics/stock-breakdown/', { params: shop ? { shop } : undefined })
  const data = query.data ?? null
  const failed = query.isError

  return (
    <ModalShell
      title={title}
      subtitle={data ? `${data.total_units.toLocaleString()} units · ${formatKESWhole(data.total_value)} at cost` : 'Units on hand × cost price'}
      onClose={onClose}
    >
      <div>
          {failed ? (
            <p className="text-center text-danger py-10">Couldn’t load the stock breakdown.</p>
          ) : !data ? (
            <p className="text-center text-muted-foreground py-10">Loading…</p>
          ) : data.items.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No stock on hand.</p>
          ) : (
            <>
              <div className="hidden sm:block rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className={`text-left ${th}`}>Item</th>
                      <th className={`text-right ${th}`}>Units</th>
                      <th className={`text-right ${th}`}>Cost price</th>
                      <th className={`text-right ${th}`}>Selling price</th>
                      <th className={`text-right ${th}`}>Value at cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map(r => (
                      <tr key={`${r.type}-${r.id}`} className="border-t border-border">
                        <td className="px-4 py-2.5">
                          <span className="font-semibold">{r.name}</span>
                          <span className="block text-xs text-muted-foreground capitalize">{r.type}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.units.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatKES(r.cost_price)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatKES(r.price)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatKES(r.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-secondary/60 border-t border-border font-bold">
                    <tr>
                      <td className="px-4 py-2.5">Total</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{data.total_units.toLocaleString()}</td>
                      <td colSpan={2} />
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatKES(data.total_value)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <ul className="sm:hidden space-y-2">
                {data.items.map(r => (
                  <li key={`${r.type}-${r.id}`} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{r.type}</p>
                      </div>
                      <p className="text-sm font-bold tabular-nums shrink-0">{formatKES(r.value)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 tabular-nums">
                      {r.units.toLocaleString()} units × {formatKES(r.cost_price)} cost · sells at {formatKES(r.price)}
                    </p>
                  </li>
                ))}
                <li className="rounded-xl bg-secondary/60 p-3 flex justify-between text-sm font-bold">
                  <span>Total · {data.total_units.toLocaleString()} units</span>
                  <span className="tabular-nums">{formatKES(data.total_value)}</span>
                </li>
              </ul>
            </>
          )}
      </div>
    </ModalShell>
  )
}
