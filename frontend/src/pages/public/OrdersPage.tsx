import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react'
import api from '@/lib/axios'
import { formatKES, formatDateTime } from '@/lib/utils'
import type { Order, OrderStatus } from '@/lib/types'
import InlineConfirm from '@/components/InlineConfirm'
import { useConfirm } from '@/hooks/useConfirm'

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING:   'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState<number | null>(null)
  const confirmCancel = useConfirm<number>()

  const fetchOrders = () => {
    api.get('/orders/my/').then(r => setOrders(r.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchOrders() }, [])

  async function cancel(id: number) {
    confirmCancel.cancel()
    setCancelling(id)
    try {
      await api.post(`/orders/${id}/cancel/`)
      fetchOrders()
    } finally {
      setCancelling(null)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <Link to="/wishlist" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
          <ShoppingBag size={14} /> Wishlist
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag size={40} className="mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground mb-4">No orders yet</p>
          <Link to="/products" className="text-primary hover:underline text-sm">Start shopping →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="border border-border rounded-2xl bg-card overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">Order #{order.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[order.status]}`}>
                      {order.status_display}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(order.created_at)} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                  {order.admin_notes && (
                    <p className="text-xs text-muted-foreground italic mt-1">"{order.admin_notes}"</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-base text-primary">{formatKES(order.total_amount)}</p>
                  {order.status === 'PENDING' && (
                    confirmCancel.isAsking(order.id) ? (
                      <div className="mt-1">
                        <InlineConfirm label="Cancel Order" onConfirm={() => cancel(order.id)} onCancel={confirmCancel.cancel} loading={cancelling === order.id} />
                      </div>
                    ) : (
                      <button onClick={() => confirmCancel.ask(order.id)} className="text-xs text-red-500 hover:underline mt-1">
                        Cancel order
                      </button>
                    )
                  )}
                </div>
                <button
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  {expanded === order.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* Expanded items */}
              {expanded === order.id && (
                <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-2">
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div>
                        <span className="font-medium">{item.item_name}</span>
                        <span className="text-muted-foreground ml-2 text-xs capitalize">({item.item_type})</span>
                        <span className="text-muted-foreground ml-2">× {item.quantity}</span>
                      </div>
                      <span className="font-medium shrink-0">{formatKES(item.subtotal)}</span>
                    </div>
                  ))}
                  {order.notes && (
                    <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">
                      Note: {order.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
