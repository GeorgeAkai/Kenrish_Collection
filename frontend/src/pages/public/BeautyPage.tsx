import { useEffect, useState } from 'react'
import { Scissors, CalendarDays } from 'lucide-react'
import api from '@/lib/axios'
import { formatKES } from '@/lib/utils'
import BookingModal from '@/components/beauty/BookingModal'
import type { Service } from '@/lib/types'

export default function BeautyPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<{ open: boolean; serviceId?: number }>({ open: false })

  useEffect(() => {
    api.get<Service[]>('/services/').then(r => setServices(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 pt-14 pb-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div>
          <p className="eyebrow text-[11px] font-semibold uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--gold-ink)' }}>
            Beauty Services
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold mb-4 leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '-0.01em' }}>
            Beauty, booked in Nakuru
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-7 max-w-md">
            Walk in polished, walk out radiant. Hairdressing, barbering, nails and manicures — booked in minutes.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setBooking({ open: true })} className="btn-primary inline-flex items-center gap-2">
              <CalendarDays size={15} /> Book Appointment
            </button>
            <a href="#services" className="btn-outline">View Services</a>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden aspect-[4/5] bg-muted shadow-card">
          <Scissors size={48} className="w-full h-full p-16 text-primary/20" />
        </div>
      </section>

      {/* Services grid */}
      <section id="services" className="max-w-6xl mx-auto px-5 py-14">
        <h2 className="section-heading mb-8">Our Services</h2>
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
      </section>

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
