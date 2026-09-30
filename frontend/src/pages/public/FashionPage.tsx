import { useEffect, useState } from 'react'
import api from '@/lib/axios'
import CatalogueCard from '@/components/CatalogueCard'
import { useWishlist } from '@/hooks/useWishlist'
import type { Handbag, Clothes, PaginatedResponse } from '@/lib/types'

type ChipKey = 'all' | 'handbags' | 'clothes'
type WishlistType = 'handbags' | 'clothes'

interface FashionItem {
  id: number
  name: string
  price: string
  image: string | null
  average_rating: number
  stock_quantity: number
  type: WishlistType
  href: string
}

const CHIPS: { key: ChipKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'handbags', label: 'Handbags' },
  { key: 'clothes', label: 'Attire' },
]

export default function FashionPage() {
  const [items, setItems] = useState<FashionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [chip, setChip] = useState<ChipKey>('all')
  const { isInWishlist, toggle } = useWishlist()

  useEffect(() => {
    Promise.all([
      api.get<PaginatedResponse<Handbag>>('/handbags/'),
      api.get<PaginatedResponse<Clothes>>('/clothes/'),
    ]).then(([handbags, clothes]) => {
      const merged: FashionItem[] = [
        ...handbags.data.results.map(h => ({ ...h, type: 'handbags' as const, href: `/handbags/${h.id}` })),
        ...clothes.data.results.map(c => ({ ...c, type: 'clothes' as const, href: `/clothes/${c.id}` })),
      ]
      setItems(merged)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = chip === 'all' ? items : items.filter(i => i.type === chip)

  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '-0.01em' }}>
          Fashion
        </h1>
        <p className="text-muted-foreground max-w-lg">Handbags and attire — browse the full collection in one place.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-8">
        {CHIPS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setChip(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              chip === key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} items</span>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-20">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-20">Nothing here yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map(item => (
            <CatalogueCard
              key={`${item.type}-${item.id}`}
              item={item}
              href={item.href}
              onWishlist={id => toggle(item.type, id)}
              inWishlist={isInWishlist(item.type, item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
