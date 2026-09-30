import { Link } from 'react-router-dom'
import { Heart, Star, Sparkles } from 'lucide-react'
import { formatKES } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

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
  /** Small uppercase label above the name, e.g. "Handbags". */
  category?: string
}

const LOW_STOCK = 3

/** Stock badge: always a dot plus a word, never colour alone. */
export function StockBadge({ stock }: { stock: number }) {
  const { t } = useLanguage()
  const [tone, label] = stock <= 0
    ? ['bg-danger-tint text-danger', t('common.soldOut')]
    : stock <= LOW_STOCK
      ? ['bg-warning-tint text-warning', t('common.onlyLeft', { n: stock })]
      : ['bg-success-tint text-success', t('common.inStock')]
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-bold ${tone}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

export default function CatalogueCard({ item, href, onWishlist, inWishlist, category }: Props) {
  const { t } = useLanguage()
  const soldOut = item.stock_quantity === 0
  return (
    <div className="group relative product-card">
      {onWishlist && (
        <button
          onClick={e => { e.preventDefault(); onWishlist(item.id) }}
          className={`absolute top-3 right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all duration-200
            ${inWishlist
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-foreground hover:scale-105'
            }`}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={!!inWishlist}
        >
          <Heart size={16} strokeWidth={1.75} fill={inWishlist ? 'currentColor' : 'none'} />
        </button>
      )}

      <Link to={href} className="block">
        <div className="product-image">
          {item.image
            ? (
              <img
                src={item.image}
                alt={item.name}
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${soldOut ? 'opacity-60 grayscale-[40%]' : ''}`}
              />
            )
            : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Sparkles size={22} className="text-gold-ink/30" />
                <span className="text-xs">{t('common.noImage')}</span>
              </div>
            )
          }

          <div className="absolute top-3 left-3">
            <StockBadge stock={item.stock_quantity} />
          </div>

          {/* "View Details" bar — slides up on hover and on keyboard focus */}
          <div className="absolute bottom-0 inset-x-0 px-3 pb-3 translate-y-full group-hover:translate-y-0 group-focus-within:translate-y-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-300">
            <div className="w-full h-10 flex items-center justify-center bg-inverse text-inverse-foreground text-[13px] font-semibold rounded-full shadow-lg">
              {t('common.viewDetails')}
            </div>
          </div>
        </div>

        <div className="product-info">
          {category && (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-1">{category}</p>
          )}
          <p className="product-title line-clamp-2 leading-snug">{item.name}</p>
          <div className="flex items-center justify-between mt-1.5">
            <p className="product-price">{formatKES(item.price)}</p>
            {item.average_rating > 0 && (
              <div className="flex items-center gap-0.5">
                <Star size={12} className="text-gold" fill="currentColor" />
                <span className="text-xs text-muted-foreground">{item.average_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}
