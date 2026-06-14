import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import api from '@/lib/axios'
import { formatDate } from '@/lib/utils'
import type { Offer } from '@/lib/types'

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/offers/').then(r => setOffers(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Page hero */}
      <section className="py-14 px-5 text-center bg-secondary/40">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-primary mb-2.5 tracking-[0.18em] uppercase">Limited Time</p>
          <h1
            className="text-4xl font-bold mb-3"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Special Offers
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Exclusive deals on beauty products, handbags, and fashion — while stocks last.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="product-card animate-pulse">
                <div className="aspect-video bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-muted rounded-full w-3/4" />
                  <div className="h-3 bg-muted rounded-full w-full" />
                  <div className="h-3 bg-muted rounded-full w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles size={40} className="text-primary/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No active offers at the moment. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {offers.map(offer => (
              <div key={offer.id} className="product-card group overflow-hidden">
                {offer.image && (
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={offer.image}
                      alt={offer.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3">
                      <span className="bg-primary text-primary-foreground text-sm font-bold px-3 py-1.5 rounded-full shadow-lg">
                        {offer.discount_percentage}% OFF
                      </span>
                    </div>
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2
                      className="text-lg font-semibold"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {offer.title}
                    </h2>
                    {!offer.image && (
                      <span className="shrink-0 text-xl font-bold product-price">{offer.discount_percentage}% OFF</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{offer.description}</p>
                  {offer.valid_until && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Valid until {formatDate(offer.valid_until)}
                    </p>
                  )}
                  <div className="mt-4 bg-primary/8 border border-primary/20 rounded-xl p-3 text-center">
                    <p className="text-sm font-semibold text-primary">Save {offer.discount_percentage}% — Visit us in store</p>
                    <a href="tel:+254708440390" className="text-xs text-muted-foreground hover:text-primary transition-colors mt-1 block">
                      📞 0708 440390
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
