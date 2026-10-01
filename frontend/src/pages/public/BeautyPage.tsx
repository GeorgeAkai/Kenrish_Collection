import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Scissors, CalendarDays, Sparkles, ArrowRight, Clock } from 'lucide-react'
import api from '@/lib/axios'
import { formatKES, nairobiDateKey, nairobiDayLabel } from '@/lib/utils'
import { formatSlotTime, type PublicSlot } from '@/lib/slots'
import { useLanguage } from '@/contexts/LanguageContext'
import TodaySchedule from '@/components/TodaySchedule'
import BookingModal from '@/components/beauty/BookingModal'
import type { Service } from '@/lib/types'

function priceRange(s: Service) {
  if (s.price_from) return s.price_to ? `${formatKES(s.price_from)} – ${formatKES(s.price_to)}` : `From ${formatKES(s.price_from)}`
  return s.price ? formatKES(s.price) : null
}

export default function BeautyPage() {
  const { t } = useLanguage()
  const [services, setServices] = useState<Service[]>([])
  const [slots, setSlots] = useState<PublicSlot[]>([])
  const [booking, setBooking] = useState<{ serviceId: number | null; time?: string } | null>(null)

  const todayKey = nairobiDateKey()
  const todayLabel = nairobiDayLabel()

  useEffect(() => {
    api.get<Service[]>('/services/').then(r => setServices(r.data)).catch(() => {})
    api.get<PublicSlot[]>(`/reservations/public-slots/?date=${todayKey}`).then(r => setSlots(r.data)).catch(() => {})
  }, [todayKey])

  const images = services.map(s => s.image).filter((x): x is string => !!x).slice(0, 3)
  const nextFree = slots.find(s => s.available && !s.past)

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="gradient-hero">
        <div className="max-w-6xl mx-auto px-4 lg:px-5 pt-10 pb-12 lg:py-20 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
          <div className="max-w-xl">
            <p className="eyebrow mb-4">{t('home.heroEyebrow')}</p>
            <h1 className="font-heading text-[2.6rem] leading-[1.05] sm:text-5xl lg:text-[3.5rem] font-semibold tracking-[-0.01em] mb-5">
              Beauty, <em className="italic text-gold-ink">booked in Nakuru.</em>
            </h1>
            <p className="text-[17px] leading-7 text-muted-foreground mb-8">
              Walk in polished, walk out radiant. Hairdressing, barbering, nails and manicures, plus the products to keep it up at home.
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start gap-3 mb-10">
              <button onClick={() => setBooking({ serviceId: null })}
                className="inline-flex items-center gap-2 h-12 px-7 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-gold-deep transition-colors">
                <CalendarDays size={17} /> {t('nav.bookAppointment')}
              </button>
              <Link to="/beauty/products"
                className="inline-flex items-center gap-2 h-12 px-7 border border-border-control text-foreground rounded-full font-semibold hover:bg-secondary transition-colors">
                <Sparkles size={16} /> Shop Beauty Products
              </Link>
            </div>
            <dl className="flex gap-7 sm:gap-10 pt-6 border-t border-border">
              {[
                [t('home.factSameDay'), t('home.factSameDaySub')],
                [t('home.fact30'), t('home.fact30Sub')],
                [t('home.factFree'), t('home.factFreeSub')],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="font-heading text-xl font-semibold leading-tight">{k}</dt>
                  <dd className="text-sm text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Collage + next free slot */}
          <div className="relative h-[320px] sm:h-[420px] lg:h-[500px]">
            {images.length > 0 ? (
              <>
                <div className="absolute left-0 top-0 w-[58%] h-[78%] rounded-[20px] overflow-hidden bg-muted shadow-[0_24px_64px_rgba(40,25,10,.18)] hero-float">
                  <img src={images[0]} alt="" className="w-full h-full object-cover" />
                </div>
                {images[1] && (
                  <div className="absolute right-0 top-[8%] w-[38%] h-[40%] rounded-[20px] overflow-hidden bg-muted shadow-[0_16px_40px_rgba(40,25,10,.14)] hero-float-delay">
                    <img src={images[1]} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                {images[2] && (
                  <div className="absolute right-[6%] bottom-0 w-[42%] h-[42%] rounded-[20px] overflow-hidden bg-muted shadow-[0_16px_40px_rgba(40,25,10,.14)]">
                    <img src={images[2]} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 rounded-[20px] bg-gold-tint flex items-center justify-center">
                <Scissors size={48} className="text-gold-ink/40" />
              </div>
            )}
            {nextFree && (
              <button onClick={() => setBooking({ serviceId: null, time: nextFree.time })}
                className="absolute left-[6%] bottom-[6%] flex items-center gap-3 bg-card rounded-xl px-4 py-3 text-left shadow-[0_24px_64px_rgba(40,25,10,.22)] hover:-translate-y-0.5 transition-transform">
                <span className="w-2.5 h-2.5 rounded-full bg-success ring-4 ring-success-tint" />
                <span className="leading-tight">
                  <span className="block text-sm font-semibold">{t('home.nextFreeSlot')}</span>
                  <span className="block text-xs text-muted-foreground">{t('home.today')} · {formatSlotTime(nextFree.time)}</span>
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Today's openings + services ──────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 lg:px-5 pb-16 lg:pb-24 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-10 items-start">
        <div className="lg:order-2">
          <TodaySchedule dateKey={todayKey} slots={slots} services={services} dateLabel={todayLabel} onBook={setBooking} />
        </div>

        <div className="lg:order-1">
          <p className="eyebrow mb-2">Expert care</p>
          <h2 className="font-heading text-3xl lg:text-4xl font-semibold mb-2">Salon services</h2>
          <p className="text-muted-foreground mb-6">Prices in KES; your stylist confirms the final quote at the chair.</p>
          <ul className="divide-y divide-border border-y border-border">
            {services.map(s => (
              <li key={s.id} className="flex items-center gap-4 py-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gold-tint shrink-0 flex items-center justify-center">
                  {s.image ? <img src={s.image} alt="" className="w-full h-full object-cover" /> : <Scissors size={20} className="text-gold-ink" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-lg font-semibold leading-tight">{s.name}</p>
                  {priceRange(s) && <p className="text-sm font-semibold text-gold-ink tabular-nums">{priceRange(s)}</p>}
                </div>
                <button onClick={() => setBooking({ serviceId: s.id })}
                  className="h-10 px-4 rounded-full border border-border-control text-sm font-semibold hover:bg-secondary shrink-0">
                  Book
                </button>
              </li>
            ))}
          </ul>
          <Link to="/beauty/services" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-ink hover:underline">
            <Clock size={14} /> All services &amp; details <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {booking && (
        <BookingModal
          services={services}
          initialServiceId={booking.serviceId ?? undefined}
          initialDate={booking.time ? todayKey : undefined}
          initialTime={booking.time}
          onClose={() => setBooking(null)}
        />
      )}
    </>
  )
}
