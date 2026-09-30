import { useEffect, useState } from 'react'
import { Gem } from 'lucide-react'
import api from '@/lib/axios'
import LuxuryItemCard from '@/components/luxury/LuxuryItemCard'

interface LuxuryListItem {
  id: number
  name: string
  price: string | null
  image: string | null
  availability: 'available' | 'reserved' | 'sold'
  edition_size: number | null
}

export default function LuxuryPage() {
  const [items, setItems] = useState<LuxuryListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<LuxuryListItem[]>('/luxury/').then(r => setItems(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <section className="max-w-4xl mx-auto px-5 pt-16 pb-10 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--gold-ink)' }}>Luxury Products</p>
        <h1 className="text-4xl sm:text-5xl mb-5" style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif", fontWeight: 500 }}>
          The Atelier Collection
        </h1>
        <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Rare pieces, by inquiry only. Each item includes its provenance, materials and dimensions — reach out to arrange a private viewing.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-5 pb-24" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24, 6rem)' }}>
        {loading ? (
          <p className="text-center text-muted-foreground py-20">Loading…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-24">
            <Gem size={40} className="mb-5" style={{ color: 'var(--gold-ink)' }} />
            <p className="text-2xl mb-2" style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif", fontWeight: 500 }}>
              Coming Soon
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              The Atelier Collection is being curated. Check back soon for our first pieces.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map(item => <LuxuryItemCard key={item.id} item={item} />)}
          </div>
        )}
      </section>
    </div>
  )
}
