import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Clock, Package, X } from 'lucide-react'
import api from '@/lib/axios'
import { formatKES, formatDateTime } from '@/lib/utils'
import type { Order, OrderStatus } from '@/lib/types'

type Tab = '' | OrderStatus

const TABS: { value: Tab; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING:   'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [tab, setTab] = useState<Tab>('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  // Action modal
  const [actionTarget, setActionTarget] = useState<Order | null>(null)
  const [actionType, setActionType] = useState<'confirm' | 'complete' | 'cancel' | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  function fetchOrders(status: Tab = tab) {
    setLoading(true)
    const params = status ? `?status=${status}` : ''
    api.get<{ results: Order[]; pending_count: number }>(`/admin/orders/${params}`)
      .then(r => { setOrders(r.data.results); setPendingCount(r.data.pending_count) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchOrders() }, [])

  function switchTab(t: Tab) { setTab(t); fetchOrders(t) }

  function openAction(order: Order, type: 'confirm' | 'complete' | 'cancel') {
    setActionTarget(order)
    setActionType(type)
    setAdminNotes(order.admin_notes)
    setActionError('')
  }

  async function submitAction() {
    if (!actionTarget || !actionType) return
    setSaving(true)
    setActionError('')
    const newStatus: OrderStatus =
      actionType === 'confirm' ? 'CONFIRMED' :
      actionType === 'complete' ? 'COMPLETED' : 'CANCELLED'
    try {
      await api.patch(`/admin/orders/${actionTarget.id}/`, { status: newStatus, admin_notes: adminNotes })
      setActionTarget(null)
      setActionType(null)
      fetchOrders()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { detail?: string; errors?: string[] } } }).response?.data
      setActionError(data?.errors?.join('\n') ?? data?.detail ?? 'Failed to update order.')
    } finally {
      setSaving(false)
    }
  }

  const actionLabel: Record<NonNullable<typeof actionType>, string> = {
    confirm: 'Confirm & Deduct Stock',
    complete: 'Mark Completed',
    cancel: 'Cancel Order',
  }
  const actionColor: Record<NonNullable<typeof actionType>, string> = {
    confirm: 'bg-blue-600 hover:bg-blue-700',
    complete: 'bg-green-600 hover:bg-green-700',
    cancel: 'bg-red-600 hover:bg-red-700',
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">Orders</h2>
          {pendingCount > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
              <Clock size={13} /> {pendingCount} pending confirmation
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => switchTab(t.value)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t.label}
            {t.value === 'PENDING' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center">
          <Package size={36} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No orders{tab ? ` with status "${tab}"` : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="border border-border rounded-xl bg-card overflow-hidden">
              {/* Row */}
              <div className="flex items-center gap-3 p-4 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">Order #{order.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[order.status]}`}>
                      {order.status_display}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.customer_username} · {formatDateTime(order.created_at)} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </p>
                  {order.notes && <p className="text-xs text-muted-foreground italic mt-0.5 truncate">"{order.notes}"</p>}
                  {order.admin_notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">Admin: {order.admin_notes}</p>}
                </div>

                <p className="font-bold text-base text-primary shrink-0">{formatKES(order.total_amount)}</p>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                  {order.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => openAction(order, 'confirm')}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors font-medium"
                      >
                        <CheckCircle size={12} /> Confirm
                      </button>
                      <button
                        onClick={() => openAction(order, 'cancel')}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors font-medium"
                      >
                        <XCircle size={12} /> Cancel
                      </button>
                    </>
                  )}
                  {order.status === 'CONFIRMED' && (
                    <button
                      onClick={() => openAction(order, 'complete')}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors font-medium"
                    >
                      <CheckCircle size={12} /> Complete
                    </button>
                  )}
                  <button
                    onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground"
                  >
                    {expanded === order.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded items */}
              {expanded === order.id && (
                <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-2">
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div>
                        <span className="font-medium">{item.item_name}</span>
                        <span className="text-muted-foreground ml-2 text-xs capitalize">({item.item_type})</span>
                        <span className="text-muted-foreground ml-2">× {item.quantity} @ {formatKES(item.unit_price)}</span>
                      </div>
                      <span className="font-medium shrink-0">{formatKES(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action modal */}
      {actionTarget && actionType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-semibold capitalize">{actionLabel[actionType]}</h3>
              <button onClick={() => setActionTarget(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted">
                <X size={15} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-muted/40 rounded-xl p-3 text-sm space-y-1">
                <p>Customer: <span className="font-medium">{actionTarget.customer_username}</span></p>
                <p>Total: <span className="font-medium text-primary">{formatKES(actionTarget.total_amount)}</span></p>
                <p>{actionTarget.items.length} item{actionTarget.items.length !== 1 ? 's' : ''}</p>
              </div>

              {actionType === 'confirm' && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  Confirming will deduct stock for each item via the inventory module. This cannot be undone.
                </p>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Message to customer <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Reason or note for the customer…"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                />
              </div>

              {actionError && (
                <p className="text-sm text-red-500 whitespace-pre-line">{actionError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={submitAction}
                  disabled={saving}
                  className={`flex-1 text-white rounded-full py-2.5 text-sm font-semibold disabled:opacity-60 transition-all ${actionColor[actionType]}`}
                >
                  {saving ? 'Saving…' : actionLabel[actionType]}
                </button>
                <button onClick={() => setActionTarget(null)} className="flex-1 border border-border rounded-full py-2.5 text-sm hover:bg-muted transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
