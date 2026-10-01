import { useEffect, useState } from 'react'
import { Scissors } from 'lucide-react'
import api from '@/lib/axios'
import { formatKES } from '@/lib/utils'
import BookingModal from '@/components/beauty/BookingModal'
import type { Service } from '@/lib/types'

export default function BeautyServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<{ open: boolean; serviceId?: number }>({ open: false })

  useEffect(() => {
    api.get<Service[]>('/services/').then(r => setServices(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <div className="mb-8">
        <h1 className="section-heading mb-2">Beauty Services</h1>
        <p className="text-muted-foreground max-w-lg">Hairdressing, barbering, nails and manicures, book in minutes.</p>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-20">Loading services…</p>
      ) : services.length === 0 ? (
        <p className="text-center text-muted-foreground py-20">No services published yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map(s => (
            <div key={s.id} className="rounded-xl border border-border bg-card overflow-hidden card-hover shadow-card">
              <div className="aspect-[4/5] bg-muted overflow-hidden">
                {s.image ? (
                  <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Scissors size={28} className="text-primary/30" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-base font-semibold mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{s.name}</h3>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{s.short_description}</p>
                <div className="flex items-center justify-between">
                  {s.price_from ? (
                    <p className="text-sm font-semibold" style={{ color: 'var(--gold-ink)' }}>
                      {s.price_to ? <>{formatKES(s.price_from)} – {formatKES(s.price_to)}</> : <>From {formatKES(s.price_from)}</>}
                    </p>
                  ) : s.price ? (
                    <p className="text-sm font-semibold" style={{ color: 'var(--gold-ink)' }}>{formatKES(s.price)}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Price on request</p>
                  )}
                  <button
                    onClick={() => setBooking({ open: true, serviceId: s.id })}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    Book
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {booking.open && (
        <BookingModal
          services={services}
          initialServiceId={booking.serviceId}
          onClose={() => setBooking({ open: false })}
        />
      )}
    </div>
  )
}
