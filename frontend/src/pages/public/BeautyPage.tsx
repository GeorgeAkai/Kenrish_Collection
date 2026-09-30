import { Link } from 'react-router-dom'
import { Scissors, CalendarDays, Sparkles } from 'lucide-react'

export default function BeautyPage() {
  return (
    <section className="max-w-6xl mx-auto px-5 pt-14 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--gold-ink)' }}>
          Beauty Services
        </p>
        <h1 className="text-4xl sm:text-5xl font-semibold mb-4 leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '-0.01em' }}>
          Beauty, booked in Nakuru
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed mb-7 max-w-md">
          Walk in polished, walk out radiant. Hairdressing, barbering, nails and manicures — plus the products to keep it up at home.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/beauty/services" className="btn-primary inline-flex items-center gap-2">
            <CalendarDays size={15} /> Book Appointment
          </Link>
          <Link to="/beauty/products" className="btn-outline inline-flex items-center gap-2">
            <Sparkles size={15} /> Shop Beauty Products
          </Link>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden aspect-[4/5] bg-muted shadow-card">
        <Scissors size={48} className="w-full h-full p-16 text-primary/20" />
      </div>
    </section>
  )
}
