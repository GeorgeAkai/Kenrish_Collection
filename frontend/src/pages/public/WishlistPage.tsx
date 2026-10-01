import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, X, CheckCircle, Scissors, Shirt } from 'lucide-react'
import api from '@/lib/axios'
import { formatKES } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import type { Wishlist } from '@/lib/types'

type ItemType = 'products' | 'handbags' | 'clothes'
type ApiType = 'product' | 'handbag' | 'clothes'
type Shop = 'beauty' | 'fashion'

const API_TYPE: Record<ItemType, ApiType> = {
  products: 'product',
  handbags: 'handbag',
  clothes: 'clothes',
}

const SHOP_TYPES: Record<Shop, ItemType[]> = {
  beauty: ['products'],
  fashion: ['handbags', 'clothes'],
}

const SHOP_META: Record<Shop, { label: string; icon: typeof Scissors; browseHref: string; browseLabel: string }> = {
  beauty: { label: 'Kenrish Beauty', icon: Scissors, browseHref: '/beauty/products', browseLabel: 'Browse Beauty Products' },
  fashion: { label: 'Kenrish Fashion', icon: Shirt, browseHref: '/fashion', browseLabel: 'Browse Fashion' },
}

interface LineItem {
  type: ItemType
  id: number
  name: string
  price: string
  stock: number
  image: string | null
}

/**
 * Kenrish Beauty and Kenrish Fashion are run as separate departments (see
 * api/views.py::create_order, which rejects a mixed-shop order outright) --
 * so each shop gets its own wishlist section and its own independent
 * "Place Order" action. An order can never span both.
 */
function ShopWishlistSection({
  shop,
  wishlist,
  onChanged,
}: {
  shop: Shop
  wishlist: Wishlist
  onChanged: () => void
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const meta = SHOP_META[shop]
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [removing, setRemoving] = useState<string | null>(null)
  const [showOrder, setShowOrder] = useState(false)
  const [notes, setNotes] = useState('')
  const [placing, setPlacing] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(false)

  const lineItems: LineItem[] = SHOP_TYPES[shop].flatMap(type =>
    (wishlist[type] ?? []).map(item => ({ type, id: item.id, name: item.name, price: item.price, stock: item.stock_quantity, image: item.image }))
  )

  function qty(type: ItemType, id: number) {
    return quantities[`${type}-${id}`] ?? 1
  }
  function setQty(type: ItemType, id: number, val: number) {
    setQuantities(q => ({ ...q, [`${type}-${id}`]: Math.max(1, val) }))
  }

  async function remove(type: ItemType, id: number, name: string) {
    setRemoving(`${type}-${id}`)
    try {
      await api.delete(`/wishlist/${type}/${id}/`)
      onChanged()
      toast.success(`Removed "${name}" from wishlist`, {
        label: 'Undo',
        onClick: async () => {
          try { await api.post(`/wishlist/${type}/${id}/`); onChanged() }
          catch { toast.error("Couldn't undo. Please add the item again.") }
        },
      })
    } catch {
      toast.error("Couldn't remove item from wishlist. Please try again.")
    } finally {
      setRemoving(null)
    }
  }

  const grandTotal = lineItems.reduce((sum, li) => sum + qty(li.type, li.id) * parseFloat(li.price), 0)

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

  if (lineItems.length === 0) {
    return (
      <div className="border border-border rounded-2xl p-8 text-center">
        <meta.icon size={28} className="mx-auto mb-3 text-primary/30" />
        <p className="text-muted-foreground mb-4 text-sm">Your {meta.label} wishlist is empty</p>
        <Link to={meta.browseHref} className="text-primary hover:underline text-sm">{meta.browseLabel}</Link>
      </div>
    )
  }

  return (
    <div>
      {orderSuccess && (
        <div className="flex items-center gap-3 p-4 mb-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm">
          <CheckCircle size={16} className="shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{meta.label} order placed successfully!</p>
            <p className="text-xs mt-0.5">We'll confirm your order shortly.</p>
          </div>
          <button onClick={() => navigate('/orders')} className="shrink-0 text-xs font-medium underline underline-offset-2">
            View orders
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 items-start">
        <div className="space-y-3">
          {lineItems.map(li => (
            <div key={`${li.type}-${li.id}`} className="p-4 border border-border rounded-2xl bg-card">
              <div className="flex items-start gap-3">
                <Link to={`/${li.type}/${li.id}`} className="shrink-0 w-16 h-16 rounded-xl bg-muted overflow-hidden">
                  {li.image
                    ? <img src={li.image} alt={li.name} className="w-full h-full object-cover" />
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
                  onClick={() => remove(li.type, li.id, li.name)}
                  disabled={removing === `${li.type}-${li.id}`}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                <div className="flex items-center gap-1">
                  <button onClick={() => setQty(li.type, li.id, qty(li.type, li.id) - 1)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors">
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
                <p className="text-sm font-semibold">{formatKES((qty(li.type, li.id) * parseFloat(li.price)).toFixed(2))}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border border-border rounded-2xl bg-card p-5 space-y-4 sticky top-4">
          <h3 className="font-semibold text-sm flex items-center gap-2"><meta.icon size={14} className="text-primary" /> {meta.label} Summary</h3>
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
            <ShoppingBag size={15} /> Place {meta.label} Order
          </button>
        </div>
      </div>

      {showOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-semibold">Confirm {meta.label} Order</h3>
              <button onClick={() => setShowOrder(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
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
                <button onClick={placeOrder} disabled={placing} className="flex-1 bg-primary text-primary-foreground rounded-full py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all">
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

export default function WishlistPage() {
  const toast = useToast()
  const [wishlist, setWishlist] = useState<Wishlist | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchWishlist = () => {
    api.get('/wishlist/').then(r => setWishlist(r.data)).catch(() => {
      toast.error("Couldn't load your wishlist. Please refresh and try again.")
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchWishlist() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>

  const totalItems = wishlist ? (wishlist.products.length + wishlist.handbags.length + wishlist.clothes.length) : 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">
        My Wishlist{totalItems > 0 && <span className="text-muted-foreground font-normal text-lg ml-2">({totalItems} items)</span>}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Beauty and Fashion are separate stores, each has its own wishlist and its own order.
      </p>

      {totalItems === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">♡</p>
          <p className="text-muted-foreground mb-4">Your wishlist is empty</p>
          <Link to="/beauty/products" className="text-primary hover:underline">Browse Beauty Products</Link>
          <span className="text-muted-foreground mx-2">·</span>
          <Link to="/fashion" className="text-primary hover:underline">Browse Fashion</Link>
        </div>
      ) : wishlist && (
        <div className="space-y-10">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              <Scissors size={13} /> Kenrish Beauty
            </h2>
            <ShopWishlistSection shop="beauty" wishlist={wishlist} onChanged={fetchWishlist} />
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              <Shirt size={13} /> Kenrish Fashion
            </h2>
            <ShopWishlistSection shop="fashion" wishlist={wishlist} onChanged={fetchWishlist} />
          </section>
        </div>
      )}
    </div>
  )
}
