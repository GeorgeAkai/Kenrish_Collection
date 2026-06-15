import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, X, CheckCircle } from 'lucide-react'
import api from '@/lib/axios'
import { formatKES } from '@/lib/utils'
import type { Wishlist } from '@/lib/types'

type ItemType = 'products' | 'handbags' | 'clothes'
type ApiType = 'product' | 'handbag' | 'clothes'

const API_TYPE: Record<ItemType, ApiType> = {
  products: 'product',
  handbags: 'handbag',
  clothes: 'clothes',
}

export default function WishlistPage() {
  const navigate = useNavigate()
  const [wishlist, setWishlist] = useState<Wishlist | null>(null)
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  // Order modal
  const [showOrder, setShowOrder] = useState(false)
  const [notes, setNotes] = useState('')
  const [placing, setPlacing] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(false)

  const fetchWishlist = () => {
    api.get('/wishlist/').then(r => setWishlist(r.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchWishlist() }, [])

  function qty(type: ItemType, id: number) {
    return quantities[`${type}-${id}`] ?? 1
  }

  function setQty(type: ItemType, id: number, val: number) {
    setQuantities(q => ({ ...q, [`${type}-${id}`]: Math.max(1, val) }))
  }

  async function remove(type: ItemType, id: number) {
    setRemoving(`${type}-${id}`)
    try {
      await api.delete(`/wishlist/${type}/${id}/`)
      fetchWishlist()
    } finally {
      setRemoving(null)
    }
  }

  // Build flat line items for totals + order payload
  const lineItems = [
    ...(wishlist?.products ?? []).map(p => ({ type: 'products' as ItemType, id: p.id, name: p.name, price: p.price, stock: p.stock_quantity })),
    ...(wishlist?.handbags ?? []).map(h => ({ type: 'handbags' as ItemType, id: h.id, name: h.name, price: h.price, stock: h.stock_quantity })),
    ...(wishlist?.clothes ?? []).map(c => ({ type: 'clothes' as ItemType, id: c.id, name: c.name, price: c.price, stock: c.stock_quantity })),
  ]

  const grandTotal = lineItems.reduce((sum, li) => sum + qty(li.type, li.id) * parseFloat(li.price), 0)
  const totalItems = lineItems.length

  async function placeOrder() {
    setPlacing(true)
    setOrderError('')
    try {
      const items = lineItems.map(li => ({
        item_type: API_TYPE[li.type],
        item_id: li.id,
        quantity: qty(li.type, li.id),
        unit_price: li.price,
      }))
      await api.post('/orders/', { items, notes })
      setOrderSuccess(true)
      setShowOrder(false)
      setNotes('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setOrderError(msg ?? 'Failed to place order. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Success banner */}
      {orderSuccess && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm">
          <CheckCircle size={16} className="shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Order placed successfully!</p>
            <p className="text-xs mt-0.5">We'll confirm your order shortly.</p>
          </div>
          <button onClick={() => navigate('/orders')} className="shrink-0 text-xs font-medium underline underline-offset-2">
            View orders
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          My Wishlist{totalItems > 0 && <span className="text-muted-foreground font-normal text-lg ml-2">({totalItems} items)</span>}
        </h1>
        {orderSuccess && (
          <button onClick={() => navigate('/orders')} className="text-sm text-primary hover:underline">
            View my orders →
          </button>
        )}
      </div>

      {totalItems === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">♡</p>
          <p className="text-muted-foreground mb-4">Your wishlist is empty</p>
          <Link to="/products" className="text-primary hover:underline">Browse products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

          {/* Items */}
          <div className="space-y-3">
            {lineItems.map(li => {
              const item = [
                ...(wishlist?.products ?? []),
                ...(wishlist?.handbags ?? []),
                ...(wishlist?.clothes ?? []),
              ].find(x => x.id === li.id)

              return (
                <div key={`${li.type}-${li.id}`} className="p-4 border border-border rounded-2xl bg-card">
                  {/* Row 1: image + name/price + remove */}
                  <div className="flex items-start gap-3">
                    <Link to={`/${li.type}/${li.id}`} className="shrink-0 w-16 h-16 rounded-xl bg-muted overflow-hidden">
                      {item?.image
                        ? <img src={item.image} alt={li.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No img</div>
                      }
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link to={`/${li.type}/${li.id}`} className="font-medium text-sm hover:text-primary transition-colors block leading-snug line-clamp-2">
                        {li.name}
                      </Link>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{li.type.slice(0, -1)}</p>
                      <p className="text-sm font-semibold text-primary mt-1">{formatKES(li.price)}</p>
                      {li.stock === 0 && <p className="text-xs text-red-500 mt-0.5">Out of stock</p>}
                      {li.stock > 0 && li.stock <= 5 && <p className="text-xs text-amber-600 mt-0.5">Only {li.stock} left</p>}
                    </div>

                    <button
                      onClick={() => remove(li.type, li.id)}
                      disabled={removing === `${li.type}-${li.id}`}
                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Row 2: qty controls + subtotal */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setQty(li.type, li.id, qty(li.type, li.id) - 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{qty(li.type, li.id)}</span>
                      <button
                        onClick={() => setQty(li.type, li.id, qty(li.type, li.id) + 1)}
                        disabled={qty(li.type, li.id) >= li.stock}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <p className="text-sm font-semibold">
                      {formatKES((qty(li.type, li.id) * parseFloat(li.price)).toFixed(2))}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Order summary */}
          <div className="border border-border rounded-2xl bg-card p-5 space-y-4 sticky top-4">
            <h2 className="font-semibold text-sm">Order Summary</h2>

            <div className="space-y-2">
              {lineItems.map(li => (
                <div key={`${li.type}-${li.id}`} className="flex justify-between text-xs text-muted-foreground">
                  <span className="truncate mr-2">{li.name} × {qty(li.type, li.id)}</span>
                  <span className="shrink-0">{formatKES((qty(li.type, li.id) * parseFloat(li.price)).toFixed(2))}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="font-semibold text-sm">Total</span>
              <span className="font-bold text-lg text-primary">{formatKES(grandTotal.toFixed(2))}</span>
            </div>

            {lineItems.some(li => li.stock === 0) && (
              <p className="text-xs text-amber-600 dark:text-amber-400">Some items are out of stock and may not be fulfilled.</p>
            )}

            <button
              onClick={() => { setOrderError(''); setShowOrder(true) }}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-full font-semibold text-sm hover:opacity-90 transition-all shadow-md shadow-primary/20"
            >
              <ShoppingBag size={15} /> Place Order
            </button>
          </div>
        </div>
      )}

      {/* Order confirmation modal */}
      {showOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-semibold">Confirm Order</h3>
              <button onClick={() => setShowOrder(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Summary */}
              <div className="bg-muted/40 rounded-xl p-4 space-y-1.5">
                {lineItems.map(li => (
                  <div key={`${li.type}-${li.id}`} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">{li.name} × {qty(li.type, li.id)}</span>
                    <span className="shrink-0 font-medium">{formatKES((qty(li.type, li.id) * parseFloat(li.price)).toFixed(2))}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-semibold text-sm mt-1">
                  <span>Total</span>
                  <span className="text-primary">{formatKES(grandTotal.toFixed(2))}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes <span className="font-normal text-muted-foreground">(optional)</span></label>
                <textarea
                  rows={3}
                  placeholder="Delivery instructions, size preferences…"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {orderError && <p className="text-sm text-red-500">{orderError}</p>}

              <div className="flex gap-3">
                <button
                  onClick={placeOrder}
                  disabled={placing}
                  className="flex-1 bg-primary text-primary-foreground rounded-full py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
                >
                  {placing ? 'Placing…' : 'Confirm Order'}
                </button>
                <button onClick={() => setShowOrder(false)} className="flex-1 border border-border rounded-full py-2.5 text-sm hover:bg-muted transition-colors">
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
