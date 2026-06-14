import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/lib/axios'
import { formatKES, formatDate } from '@/lib/utils'
import { Sparkles, ChevronRight, Star, Scissors, Phone, CalendarDays, CheckCircle2, Ban } from 'lucide-react'
import type { Product, Handbag, Clothes, Offer, Service } from '@/lib/types'

interface PublicSlot { time: string; available: boolean; booked: boolean; past: boolean }

function formatSlotTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

interface HomeData {
  featured_products: Product[]
  featured_handbags: Handbag[]
  featured_clothes: Clothes[]
  offers: Offer[]
}

type Tab = 'products' | 'handbags' | 'clothes'

const TABS: { key: Tab; label: string }[] = [
  { key: 'products', label: 'Beauty' },
  { key: 'handbags', label: 'Handbags' },
  { key: 'clothes', label: 'Clothing' },
]

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    role: 'Regular Client since 2022',
    text: 'Kenrish Collection completely transformed my wardrobe. The handbag selection is incredible and the team is so helpful — I always leave feeling like the best version of myself.',
    initials: 'SM',
    color: 'bg-fuchsia-400',
  },
  {
    name: 'Grace K.',
    role: 'Beauty Enthusiast',
    text: 'The best beauty boutique in Nakuru! Clean environment, skilled professionals, and the product range is unlike anywhere else in the city.',
    initials: 'GK',
    color: 'bg-violet-500',
  },
  {
    name: 'Mary W.',
    role: 'Loyal Customer',
    text: 'Amazing hairdressing services and gorgeous clothes. I love that I can shop and get pampered all in one place. Highly recommended!',
    initials: 'MW',
    color: 'bg-pink-400',
  },
]

function ItemCard({ item, href }: { item: Product | Handbag | Clothes; href: string }) {
  return (
    <Link to={href} className="group block product-card">
      <div className="product-image">
        {item.image
          ? <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2 bg-muted">
              <Sparkles size={24} className="text-primary/30" />
              <span className="text-xs">No image</span>
            </div>
          )
        }
        {item.stock_quantity === 0 && (
          <div className="absolute top-2.5 left-2.5 product-tag">Sold out</div>
        )}
        <div className="absolute bottom-0 inset-x-0 px-3 pb-3 translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-full py-2.5 bg-primary text-primary-foreground text-xs font-semibold rounded-xl text-center shadow-lg">
            View Details
          </div>
        </div>
      </div>
      <div className="product-info">
        <p className="product-title truncate">{item.name}</p>
        <div className="flex items-center justify-between mt-1.5">
          <p className="product-price">{formatKES(item.price)}</p>
          {item.average_rating > 0 && (
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map(i => (
                <Star
                  key={i}
                  size={10}
                  className="text-amber-400"
                  fill={i <= Math.round(item.average_rating) ? "currentColor" : "none"}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-0.5">{item.average_rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

function ServiceDesc({ text }: { text: string }) {
  const clean = text.trim().replace(/\s*\d+\.\s*/g, ' ').trim()
  return <p className="text-sm text-muted-foreground leading-relaxed mb-5">{clean}</p>
}

function SectionHeader({ title, label: sectionLabel, href, cta = 'View all' }: {
  title: string; label?: string; href: string; cta?: string
}) {
  return (
    <div className="flex items-end justify-between mb-10">
      <div>
        {sectionLabel && (
          <p className="text-xs font-semibold text-primary mb-2 tracking-[0.18em] uppercase">{sectionLabel}</p>
        )}
        <h2
          className="text-3xl lg:text-4xl font-semibold text-foreground leading-tight"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {title}
        </h2>
      </div>
      <Link to={href} className="flex items-center gap-1 text-sm text-primary hover:underline underline-offset-2 font-medium shrink-0 ml-4">
        {cta} <ChevronRight size={14} />
      </Link>
    </div>
  )
}

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('products')
  const [todaySlots, setTodaySlots] = useState<PublicSlot[]>([])

  const todayKey = new Date().toISOString().split('T')[0]
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  useEffect(() => {
    Promise.all([
      api.get('/home/').then(r => r.data),
      api.get('/services/').then(r => r.data).catch(() => []),
      api.get<PublicSlot[]>(`/reservations/public-slots/?date=${todayKey}`).then(r => r.data).catch(() => []),
    ]).then(([homeData, svcData, slots]) => {
      setData(homeData)
      setServices(svcData.slice(0, 2))
      setTodaySlots(slots)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Sparkles size={24} className="text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

  // Collect up to 4 images for the hero mosaic
  const heroImages: string[] = [
    ...(data?.featured_handbags?.slice(0, 2).map(h => h.image).filter(Boolean) ?? []),
    ...(data?.featured_products?.slice(0, 2).map(p => p.image).filter(Boolean) ?? []),
    ...(data?.featured_clothes?.slice(0, 2).map(c => c.image).filter(Boolean) ?? []),
  ].filter((x): x is string => !!x).slice(0, 4)

  const tabItems: Record<Tab, (Product | Handbag | Clothes)[]> = {
    products: data?.featured_products ?? [],
    handbags: data?.featured_handbags ?? [],
    clothes: data?.featured_clothes ?? [],
  }
  const tabHrefs: Record<Tab, (id: number) => string> = {
    products: id => `/products/${id}`,
    handbags: id => `/handbags/${id}`,
    clothes: id => `/clothes/${id}`,
  }
  const tabViewAll: Record<Tab, string> = {
    products: '/products',
    handbags: '/handbags',
    clothes: '/clothes',
  }

  return (
    <div className="overflow-hidden">

      {/* ═══ HERO — split layout (left text / right image mosaic) ═════════ */}
      <section className="relative min-h-[90vh] flex items-center gradient-hero overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-5 py-16 sm:py-24 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left — copy */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-4 py-1.5 text-xs mb-8 text-primary font-medium">
                <Sparkles size={11} />
                New Collection — Premium Fashion &amp; Beauty
              </div>

              <h1
                className="text-5xl lg:text-[3.75rem] font-semibold leading-[1.07] mb-6 text-foreground"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Beauty,<br />
                <em className="not-italic text-gradient-plum">Redefined.</em>
              </h1>

              <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                Curated cosmetics, designer handbags, elevated fashion &amp; world-class grooming — all in one boutique at Shabaab, Nakuru.
              </p>

              <div className="flex flex-wrap gap-4 mb-14">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-all shadow-xl shadow-primary/30"
                >
                  Shop Now <ChevronRight size={15} />
                </Link>
                <Link
                  to="/services"
                  className="inline-flex items-center gap-2 px-8 py-3.5 border-2 border-primary/30 text-primary rounded-full font-medium hover:bg-secondary transition-all"
                >
                  Book a Service
                </Link>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-10">
                {[['500+', 'Products'], ['1000+', 'Happy Clients'], ['15+', 'Services']].map(([val, label]) => (
                  <div key={label}>
                    <div
                      className="text-2xl font-semibold text-foreground"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {val}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — image mosaic (desktop only) */}
            <div className="hidden lg:grid grid-cols-2 gap-3 h-[560px]">
              {heroImages.length >= 2 ? (
                <>
                  {/* Left col — tall */}
                  <div className="flex flex-col gap-3">
                    <div className="rounded-2xl overflow-hidden flex-1 bg-muted">
                      {heroImages[0] && (
                        <img src={heroImages[0]} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    {heroImages[2] && (
                      <div className="rounded-2xl overflow-hidden h-40 bg-muted shrink-0">
                        <img src={heroImages[2]} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  {/* Right col — offset */}
                  <div className="flex flex-col gap-3 pt-8">
                    {heroImages[1] && (
                      <div className="rounded-2xl overflow-hidden h-44 bg-muted shrink-0">
                        <img src={heroImages[1]} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="rounded-2xl overflow-hidden flex-1 bg-muted">
                      {heroImages[3] && (
                        <img src={heroImages[3]} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Fallback decorative panel */
                <div className="col-span-2 rounded-3xl bg-primary/8 border border-primary/15 flex items-center justify-center">
                  <Sparkles size={64} className="text-primary/20" />
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ═══ PROMO STRIP ═══════════════════════════════════════════════════ */}
      <div className="bg-primary text-primary-foreground py-3 px-5 overflow-hidden">
        <div className="flex items-center justify-center gap-8 text-sm font-medium flex-wrap">
          <span>✦ 500+ Curated Products</span>
          <span className="hidden sm:block">✦ Free beauty consultations</span>
          <span className="hidden md:block">✦ Same-day service bookings</span>
          <span>✦ Mon–Sat 8AM–8PM · Nakuru</span>
        </div>
      </div>

      {/* ═══ COLLECTIONS — tabbed ══════════════════════════════════════════ */}
      {(data?.featured_products?.length || data?.featured_handbags?.length || data?.featured_clothes?.length) ? (
        <section className="py-20 max-w-7xl mx-auto px-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <p className="text-xs font-semibold text-primary mb-2.5 tracking-[0.18em] uppercase">
                Curated For You
              </p>
              <h2
                className="text-3xl lg:text-4xl font-semibold text-foreground leading-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Our Collections
              </h2>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 flex-wrap">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeTab === key
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                      : 'bg-secondary text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {tabItems[activeTab].length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {tabItems[activeTab].slice(0, 8).map(item => (
                <ItemCard key={item.id} item={item} href={tabHrefs[activeTab](item.id)} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-16">No items available yet.</p>
          )}

          <div className="text-center mt-10">
            <Link
              to={tabViewAll[activeTab]}
              className="inline-flex items-center gap-2 px-7 py-3 border border-border rounded-full text-sm font-medium hover:bg-secondary transition-colors"
            >
              View All {TABS.find(t => t.key === activeTab)?.label}
              <ChevronRight size={14} />
            </Link>
          </div>
        </section>
      ) : null}

      {/* ═══ CLOTHING ══════════════════════════════════════════════════════ */}
      {data?.featured_clothes && data.featured_clothes.length > 0 && (
        <section className="py-24 max-w-7xl mx-auto px-6">
          <div className="relative rounded-3xl overflow-hidden min-h-[380px] flex items-center">
            {/* base background — dark on both modes so text is always white */}
            <div className="absolute inset-0 bg-[#1A1220] dark:bg-[#08060E]" />
            <div className="absolute inset-0 hidden dark:block bg-gradient-to-br from-[#110A1C] via-[#08060E] to-[#180A16]" />
            <img
              src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1400&h=700&fit=crop&auto=format"
              alt="Clothing boutique interior"
              className="absolute inset-0 w-full h-full object-cover opacity-40 dark:opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1A1220]/90 via-[#1A1220]/60 to-transparent dark:from-[#08060E]/95 dark:via-[#08060E]/70 dark:to-transparent" />
            <div className="absolute inset-0 hidden dark:block bg-gradient-to-br from-violet-900/30 via-transparent to-fuchsia-900/20 pointer-events-none" />

            <div className="relative px-10 md:px-16 py-16 max-w-lg">
              <p className="text-xs font-semibold text-primary mb-3 tracking-[0.18em] uppercase">
                New This Season
              </p>
              <h2
                className="text-4xl lg:text-5xl font-semibold text-white leading-tight mb-5"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                The Art of Getting Dressed
              </h2>
              <p className="text-white/70 text-sm leading-relaxed mb-8">
                Our clothing styles — elevated basics, statement pieces, and everything in between. Styled for real life, designed to last.
              </p>
              <Link
                to="/clothes"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-foreground dark:bg-primary dark:text-primary-foreground rounded-full font-medium text-sm hover:opacity-90 transition-opacity shadow-xl"
              >
                Explore Clothing <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══ FEATURE STRIP ═════════════════════════════════════════════════ */}
      <section className="py-12 border-y border-border">
        <div className="max-w-7xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: '✦', title: 'Authentic Products', desc: 'Every item is 100% genuine, sourced directly from trusted suppliers.' },
            { icon: '✦', title: 'Expert Stylists', desc: 'Our team has years of luxury beauty and fashion experience.' },
            { icon: '✦', title: 'Same-Day Booking', desc: 'Book beauty and grooming appointments and walk in the same day.' },
            { icon: '✦', title: 'Personal Service', desc: 'Personalised recommendations from our in-store beauty experts.' },
          ].map(f => (
            <div key={f.title} className="flex flex-col gap-2">
              <span className="text-primary text-base font-bold">{f.icon}</span>
              <h4 className="font-semibold text-sm text-foreground">{f.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ SERVICES PREVIEW ══════════════════════════════════════════════ */}
      {services.length > 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-secondary/40 dark:hidden" />
          <div className="hidden dark:block absolute inset-0 bg-gradient-to-br from-[#110A1C] via-[#08060E] to-[#1A0818]" />

          <div className="relative max-w-7xl mx-auto px-5">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold text-primary mb-2.5 tracking-[0.18em] uppercase">Expert Care</p>
              <h2
                className="text-3xl lg:text-4xl font-semibold mb-4"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Beauty Services
              </h2>
              <p className="text-muted-foreground max-w-xs mx-auto text-sm leading-relaxed">
                Award-winning stylists — available by appointment or walk-in.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
              {services.map(svc => (
                <div
                  key={svc.id}
                  className="group rounded-3xl overflow-hidden border border-border bg-card hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500"
                >
                  {svc.image ? (
                    <div className="relative h-56 overflow-hidden bg-muted">
                      <img
                        src={svc.image}
                        alt={svc.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-primary/20 to-transparent" />
                      <div className="absolute bottom-4 left-5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md text-white border border-white/20">
                          <Scissors size={10} />
                          Professional
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-56 bg-secondary flex items-center justify-center">
                      <Sparkles size={36} className="text-primary/30" />
                    </div>
                  )}

                  <div className="p-7">
                    <h3
                      className="text-xl font-semibold mb-2"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {svc.name}
                    </h3>
                    <ServiceDesc text={svc.short_description} />
                    <div className="flex items-center justify-between">
                      <span className="product-price font-bold text-base">{formatKES(svc.price)}</span>
                      <Link
                        to="/services"
                        className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline underline-offset-2"
                      >
                        Learn more <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link
                to="/services"
                className="inline-flex items-center gap-2 px-7 py-3 border border-border rounded-full text-sm font-medium hover:bg-secondary transition-colors"
              >
                View All Services <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══ ACTIVE OFFERS ═════════════════════════════════════════════════ */}
      {data?.offers && data.offers.length > 0 && (
        <section className="py-20 px-5 bg-background">
          <div className="max-w-7xl mx-auto">
            <SectionHeader title="Current Offers" label="Limited Time" href="/offers" cta="All offers" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.offers.slice(0, 3).map(offer => (
                <div key={offer.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card card-hover">
                  {offer.image && (
                    <div className="h-52 overflow-hidden">
                      <img
                        src={offer.image}
                        alt={offer.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 product-tag shadow-md">
                    {offer.discount_percentage}% OFF
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-foreground">{offer.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{offer.description}</p>
                    {offer.valid_until && (
                      <p className="text-xs text-muted-foreground mt-2">Valid until {formatDate(offer.valid_until)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ TESTIMONIALS ══════════════════════════════════════════════════ */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-muted/30 dark:bg-transparent" />
        <div className="relative max-w-7xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary mb-2.5 tracking-[0.18em] uppercase">Client Love</p>
            <h2
              className="text-3xl lg:text-4xl font-semibold"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              What They Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div
                key={t.name}
                className="rounded-2xl p-7 border border-border bg-card hover:shadow-xl hover:shadow-primary/8 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex gap-1 mb-5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={13} className="text-gold" fill="currentColor" />
                  ))}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6 italic">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BOOK YOUR SPOT NOW ════════════════════════════════════════════ */}
      <section className="py-20 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl overflow-hidden border border-border grid grid-cols-1 lg:grid-cols-2 shadow-2xl shadow-primary/10">

            {/* Left — copy */}
            <div
              className="relative p-10 lg:p-14 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #7C3060 0%, #9B3D78 50%, #A85090 100%)' }}
            >
              {/* decorative circles */}
              <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />

              <div className="relative">
                <p className="text-xs font-semibold text-white/60 mb-3 tracking-[0.18em] uppercase">
                  Appointments
                </p>
                <h2
                  className="text-3xl lg:text-4xl font-semibold text-white mb-5 leading-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Book Your<br />Spot Now
                </h2>
                <p className="text-white/75 text-sm leading-relaxed mb-8 max-w-sm">
                  See real-time availability and lock in your preferred time. Hair, nails, barber &amp; more —
                  Mon–Sat, 8 AM to 8 PM.
                </p>

                <ul className="space-y-3 mb-10">
                  {[
                    '30-minute time blocks — pick the exact slot',
                    'Walk-in or pre-book online instantly',
                    'Hair, nails, barber, manicure & more',
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-white/90">
                      <CheckCircle2 size={14} className="text-white/60 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/reservation"
                    className="inline-flex items-center gap-2.5 bg-white text-primary px-7 py-3 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity shadow-xl"
                  >
                    <CalendarDays size={14} />
                    View Full Calendar
                  </Link>
                  <a
                    href="tel:+254708440390"
                    className="inline-flex items-center gap-2.5 border border-white/30 text-white px-7 py-3 rounded-full font-semibold text-sm hover:bg-white/10 transition-colors"
                  >
                    <Phone size={14} />
                    Call Us
                  </a>
                </div>
              </div>
            </div>

            {/* Right — live today's schedule preview */}
            <div className="bg-card p-8 lg:p-10 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-semibold text-sm">Today's Schedule</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{todayLabel}</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  Live
                </span>
              </div>

              {todaySlots.length === 0 ? (
                /* Sunday or no data */
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <CalendarDays size={36} className="text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">We're closed today (Sunday).</p>
                  <p className="text-xs text-muted-foreground mt-1">Check back Monday–Saturday.</p>
                  <Link
                    to="/reservation"
                    className="mt-5 inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                  >
                    Browse future dates <ChevronRight size={12} />
                  </Link>
                </div>
              ) : (
                <>
                  {/* Summary pills */}
                  <div className="flex gap-3 mb-5">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-xs font-medium text-green-700 dark:text-green-400">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      {todaySlots.filter(s => s.available).length} open slots
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-xs font-medium text-primary">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {todaySlots.filter(s => s.booked).length} booked
                    </span>
                  </div>

                  {/* Time blocks — show next ~10 upcoming (skip far-past) */}
                  <div className="space-y-1.5 flex-1 overflow-hidden">
                    {todaySlots.filter(s => !s.past || s.booked).slice(0, 10).map(slot => (
                      <div
                        key={slot.time}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors
                          ${slot.booked
                            ? 'bg-primary/8 border border-primary/15'
                            : 'bg-muted/30 border border-transparent'
                          }`}
                      >
                        <span className="w-16 shrink-0 font-mono text-muted-foreground">
                          {formatSlotTime(slot.time)}
                        </span>
                        <span className={`flex-1 h-2 rounded-full ${
                          slot.booked ? 'bg-primary/35' : 'bg-green-200 dark:bg-green-900/40'
                        }`} />
                        <div className="shrink-0 flex items-center gap-1">
                          {slot.booked ? (
                            <>
                              <Ban size={10} className="text-primary/60" />
                              <span className="text-primary/70 font-medium">Booked</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={10} className="text-green-500" />
                              <span className="text-green-600 dark:text-green-400 font-medium">Free</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link
                    to="/reservation"
                    className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    See full schedule <ChevronRight size={14} />
                  </Link>
                </>
              )}
            </div>

          </div>
        </div>
      </section>

    </div>
  )
}
