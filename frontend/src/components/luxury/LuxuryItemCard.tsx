import { Link } from 'react-router-dom'
import { Gem } from 'lucide-react'
import { formatKES } from '@/lib/utils'

interface Props {
  item: {
    id: number
    name: string
    price: string | null
    image: string | null
    availability: 'available' | 'reserved' | 'sold'
    edition_size: number | null
  }
}

const AVAILABILITY_LABEL: Record<string, string> = {
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
}

export default function LuxuryItemCard({ item }: Props) {
  return (
    <Link to={`/luxury/${item.id}`} className="group block product-card">
      <div className="product-image">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gem size={28} className="text-primary/30" />
          </div>
        )}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-card/85 backdrop-blur-sm text-foreground">
          {AVAILABILITY_LABEL[item.availability]}
        </div>
      </div>
      <div className="product-info">
        <p className="text-sm font-medium truncate" style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif" }}>{item.name}</p>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-sm" style={{ color: 'var(--gold-ink)' }}>{item.price ? formatKES(item.price) : 'Price on Application'}</p>
          {item.edition_size && <span className="text-xs text-muted-foreground">Edition of {item.edition_size}</span>}
        </div>
      </div>
    </Link>
  )
}
