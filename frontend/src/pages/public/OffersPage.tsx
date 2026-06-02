import { useEffect, useState } from 'react'
import api from '@/lib/axios'
import { formatDate } from '@/lib/utils'
import type { Offer } from '@/lib/types'

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/offers/').then(r => setOffers(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">Special Offers</h1>
        <p className="text-muted-foreground mt-2">Exclusive deals just for you</p>
      </div>
      {offers.length === 0 ? (
        <p className="text-center text-muted-foreground py-20">No active offers at the moment. Check back soon!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {offers.map(offer => (
            <div key={offer.id} className="product-card">
              {offer.image && (
                <div className="aspect-video overflow-hidden">
                  <img src={offer.image} alt={offer.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold">{offer.title}</h2>
                  <span className="shrink-0 text-2xl font-bold product-price">{offer.discount_percentage}%</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{offer.description}</p>
                {offer.valid_until && (
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <span>Valid until {formatDate(offer.valid_until)}</span>
                  </p>
                )}
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md p-3 text-center">
                  <p className="text-sm font-medium text-amber-800">Save {offer.discount_percentage}% — Visit us in store</p>
                  <a href="tel:+254708440390" className="text-xs text-amber-600 hover:underline mt-1 block">0708 440390</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
