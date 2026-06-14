import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '@/lib/axios'
import RatingWidget from '@/components/RatingWidget'
import { useWishlist } from '@/hooks/useWishlist'
import { formatKES, formatDate } from '@/lib/utils'
import { Heart, ChevronLeft, Star, Package } from 'lucide-react'
import type { Product } from '@/lib/types'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const { isInWishlist, toggle } = useWishlist()

  useEffect(() => {
    api.get(`/products/${id}/`).then(r => setProduct(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  )
  if (!product) return (
    <div className="p-8 text-center">
      <Package size={48} className="text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground mb-4">Product not found.</p>
      <Link to="/products" className="btn-outline">← Back to products</Link>
    </div>
  )

  const inWishlist = isInWishlist('products', product.id)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-primary transition-colors">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-primary transition-colors">Products</Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[200px]">{product.name}</span>
      </nav>

      <Link to="/products" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6 lg:hidden">
        <ChevronLeft size={16} /> Back to products
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Image */}
          <div className="product-image rounded-3xl overflow-hidden">
            {product.image
              ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
            }
          </div>

        {/* Details */}
        <div className="flex flex-col">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            {product.name}
          </h1>

          <div className="mt-3 flex items-center gap-3">
            <p className="product-price text-2xl">{formatKES(product.price)}</p>
            {product.average_rating > 0 && (
              <div className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-full">
                <Star size={12} className="text-gold" fill="currentColor" />
                <span className="text-xs font-semibold">{product.average_rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Stock badge */}
          <div className="mt-4">
            <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ${
              product.stock_quantity > 5
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : product.stock_quantity > 0
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
            </span>
          </div>

          {/* Description */}
          {product.description && (
            <p className="mt-5 text-muted-foreground text-sm leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Rating */}
          <div className="mt-6 p-4 bg-muted/50 rounded-2xl">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Rate this product</p>
            <RatingWidget
              type="products"
              itemId={product.id}
              currentRating={product.average_rating}
              onRated={avg => setProduct(p => p ? { ...p, average_rating: avg } : p)}
            />
          </div>

          {/* Wishlist */}
          <button
            onClick={() => toggle('products', product.id)}
            className={`mt-5 btn-modern ${inWishlist ? 'btn-modern--primary' : 'btn-modern--secondary'}`}
          >
            <Heart size={16} fill={inWishlist ? 'currentColor' : 'none'} />
            {inWishlist ? 'Saved to Wishlist' : 'Add to Wishlist'}
          </button>

          {product.created_at && (
            <p className="text-xs text-muted-foreground mt-4">Added {formatDate(product.created_at)}</p>
          )}
        </div>
      </div>
    </div>
  )
}
