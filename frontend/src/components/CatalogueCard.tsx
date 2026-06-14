import { Link } from 'react-router-dom'
import { Heart, Star, Sparkles } from 'lucide-react'
import { formatKES } from '@/lib/utils'

interface CatalogueItem {
  id: number
  name: string
  price: string
  image: string | null
  average_rating: number
  stock_quantity: number
}

interface Props {
  item: CatalogueItem
  href: string
  onWishlist?: (id: number) => void
  inWishlist?: boolean
}

export default function CatalogueCard({ item, href, onWishlist, inWishlist }: Props) {
  return (
    <div className="group relative product-card">
      {/* Wishlist button — fades in on hover (Figma style) */}
      {onWishlist && (
        <button
          onClick={e => { e.preventDefault(); onWishlist(item.id) }}
          className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center
            shadow-md transition-all duration-200
            sm:opacity-0 sm:group-hover:opacity-100
            ${inWishlist
              ? 'bg-rose-500 text-white scale-110'
              : 'bg-card/85 backdrop-blur-sm text-muted-foreground hover:scale-110'
            }`}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart size={13} fill={inWishlist ? 'currentColor' : 'none'} />
        </button>
      )}

      <Link to={href} className="block">
        {/* Image — portrait 4:5 aspect ratio */}
        <div className="product-image">
          {item.image
            ? (
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            )
            : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Sparkles size={22} className="text-primary/25" />
                <span className="text-xs">No image</span>
              </div>
            )
          }

          {/* Sold out pill badge */}
          {item.stock_quantity === 0 && (
            <div className="absolute top-2.5 left-2.5 product-tag">
              Sold out
            </div>
          )}

          {/* "Add to Bag" bar — slides up on hover */}
          <div className="absolute bottom-0 inset-x-0 px-3 pb-3 translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="w-full py-2.5 bg-primary text-primary-foreground text-xs font-semibold rounded-xl text-center shadow-lg">
              View Details
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="product-info">
          <p className="product-title truncate leading-snug">{item.name}</p>
          <div className="flex items-center justify-between mt-1.5">
            <p className="product-price">{formatKES(item.price)}</p>
            {item.average_rating > 0 && (
              <div className="flex items-center gap-0.5">
                <Star size={11} className="text-gold" fill="currentColor" />
                <span className="text-xs text-muted-foreground">{item.average_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}
