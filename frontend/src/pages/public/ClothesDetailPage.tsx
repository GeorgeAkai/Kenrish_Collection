import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '@/lib/axios'
import RatingWidget from '@/components/RatingWidget'
import { useWishlist } from '@/hooks/useWishlist'
import { formatKES, formatDate } from '@/lib/utils'
import { Heart, Star, Sparkles } from 'lucide-react'
import type { Clothes } from '@/lib/types'

export default function ClothesDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<Clothes | null>(null)
  const [loading, setLoading] = useState(true)
  const { isInWishlist, toggle } = useWishlist()

  useEffect(() => {
    api.get(`/clothes/${id}/`).then(r => setItem(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  )
  if (!item) return (
    <div className="p-8 text-center">
      <Sparkles size={48} className="text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground mb-4">Item not found.</p>
      <Link to="/clothes" className="btn-outline">← Back to clothes</Link>
    </div>
  )

  const inWishlist = isInWishlist('clothes', item.id)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-primary">Home</Link><span>/</span>
        <Link to="/clothes" className="hover:text-primary">Clothes</Link><span>/</span>
        <span className="text-foreground truncate max-w-[200px]">{item.name}</span>
      </nav>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        <div className="aspect-square bg-muted rounded-3xl overflow-hidden">
          {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><Sparkles size={48} className="text-primary/20" /></div>}
        </div>
        <div className="flex flex-col">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>{item.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <p className="text-2xl text-primary font-bold">{formatKES(item.price)}</p>
            {item.average_rating > 0 && (
              <div className="flex items-center gap-1 bg-muted px-2 py-1">
                <Star size={13} className="text-gold" fill="currentColor" />
                <span className="text-xs font-medium">{item.average_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ${
              item.stock_quantity > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {item.stock_quantity > 0 ? `${item.stock_quantity} in stock` : 'Out of stock'}
            </span>
            {item.size && <span className="text-xs px-3 py-1.5 rounded-full bg-muted font-medium">Size: {item.size}</span>}
            {item.color && <span className="text-xs px-3 py-1.5 rounded-full bg-muted font-medium">Color: {item.color}</span>}
          </div>
          {item.description && <p className="mt-5 text-muted-foreground text-sm leading-relaxed">{item.description}</p>}
          <div className="mt-6 p-4 bg-muted/50 rounded-2xl">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Rate this item</p>
            <RatingWidget type="clothes" itemId={item.id} currentRating={item.average_rating}
              onRated={avg => setItem(i => i ? { ...i, average_rating: avg } : i)} />
          </div>
          <button onClick={() => toggle('clothes', item.id)}
            className={`mt-5 flex items-center justify-center gap-2.5 py-3 rounded-2xl border-2 text-sm font-semibold transition-all ${
              inWishlist ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary hover:text-primary'
            }`}>
            <Heart size={16} fill={inWishlist ? 'currentColor' : 'none'} />
            {inWishlist ? 'Saved to Wishlist' : 'Add to Wishlist'}
          </button>
          {item.created_at && <p className="text-xs text-muted-foreground mt-4">Added {formatDate(item.created_at)}</p>}
        </div>
      </div>
    </div>
  )
}
