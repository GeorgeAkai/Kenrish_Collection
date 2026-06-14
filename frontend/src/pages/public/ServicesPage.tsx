import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/lib/axios'
import { formatKES } from '@/lib/utils'
import { Sparkles, ChevronRight, CalendarDays } from 'lucide-react'
import type { Service } from '@/lib/types'

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/services/').then(r => setServices(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Sparkles size={24} className="text-primary animate-pulse" />
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <section className="py-16 px-5 text-center bg-secondary/40">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-primary mb-2.5 tracking-[0.18em] uppercase">Expert Care</p>
          <h1
            className="text-4xl font-bold mb-4"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Beauty Services
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Professional beauty &amp; grooming services in Nakuru — available by appointment or walk-in.
          </p>
        </div>
      </section>

      {/* Services grid */}
      <section className="max-w-6xl mx-auto px-5 py-14">
        {services.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">No services listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(s => (
              <div
                key={s.id}
                className="group rounded-2xl overflow-hidden border border-border bg-card transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1"
              >
                {/* Service image with gradient overlay */}
                {s.image ? (
                  <div className="relative h-52 overflow-hidden bg-muted">
                    <img
                      src={s.image}
                      alt={s.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-primary/20 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md text-white border border-white/25">
                        <Sparkles size={10} />
                        Professional Service
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-52 bg-secondary flex items-center justify-center">
                    <Sparkles size={32} className="text-primary/30" />
                  </div>
                )}

                {/* Service body */}
                <div className="p-6">
                  <h2
                    className="text-xl font-semibold mb-1"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {s.name}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{s.short_description}</p>
                  {s.full_description && s.full_description !== s.short_description && (
                    <details className="mb-4">
                      <summary className="text-xs text-primary cursor-pointer hover:underline underline-offset-2 flex items-center gap-1">
                        Read more <ChevronRight size={11} />
                      </summary>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.full_description}</p>
                    </details>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="product-price font-bold text-base">{formatKES(s.price)}</p>
                    <Link
                      to="/reservation"
                      className="inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-4 py-2 rounded-full font-semibold hover:opacity-90 transition-opacity shadow-md"
                    >
                      <CalendarDays size={11} />
                      Book Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="px-5 pb-16">
        <div
          className="max-w-2xl mx-auto rounded-3xl p-12 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #7C3060 0%, #A85090 55%, #C07DB0 100%)' }}
        >
          <Sparkles size={28} className="mx-auto mb-4 text-white/80" />
          <h2
            className="text-2xl font-bold mb-3 text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Book an Appointment
          </h2>
          <p className="text-white/75 mb-8 text-sm leading-relaxed">
            Visit us Mon–Sat, 8AM–8PM at Shabaab, Nakuru. Walk-ins welcome.
          </p>
          <a
            href="tel:+254708440390"
            className="inline-flex items-center gap-2 bg-white text-primary px-8 py-3.5 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity shadow-xl"
          >
            📞 Call 0708 440390
          </a>
        </div>
      </section>
    </div>
  )
}
