import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/lib/axios'
import { formatKES, formatPriceRange, nairobiDateKey, nairobiDayLabel } from '@/lib/utils'
import { Sparkles, ChevronRight, Star, Scissors, Phone, CalendarDays, CheckCircle2, Truck, ShieldCheck, Headphones, Search, X, Shirt, ArrowRight } from 'lucide-react'
import type { Product, Handbag, Clothes, Offer, Service } from '@/lib/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { LOGO_URL } from '@/lib/brand'
import TodaySchedule from '@/components/TodaySchedule'
import ShopStatusWatch from '@/components/ShopStatusWatch'
import BookingModal from '@/components/beauty/BookingModal'
import type { PublicSlot } from '@/lib/slots'


interface HomeData {
  featured_products: Product[]
  featured_handbags: Handbag[]
  featured_clothes: Clothes[]
  offers: Offer[]
}

type Tab = 'products' | 'handbags' | 'clothes'

function ItemCard({ item, href }: { item: Product | Handbag | Clothes; href: string }) {
  const { t } = useLanguage()
  return (
    <Link to={href} className="group block product-card">
      <div className="product-image">
        {item.image
          ? <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2 bg-muted">
              <Sparkles size={24} className="text-primary/30" />
              <span className="text-xs">{t('common.noImage')}</span>
            </div>
          )
        }
        {item.stock_quantity === 0 && (
          <div className="absolute top-2.5 left-2.5 product-tag">{t('common.soldOut')}</div>
        )}
        <div className="absolute bottom-0 inset-x-0 px-3 pb-3 translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-full py-2.5 bg-primary text-primary-foreground text-xs font-semibold rounded-xl text-center shadow-lg">
            {t('common.viewDetails')}
          </div>
        </div>
      </div>
      <div className="product-info">
        <p className="product-title truncate">{item.name}</p>
        <div className="flex items-center justify-between mt-1.5">
          <p className="product-price">{formatPriceRange(item.price, item.max_price, 'from', t('common.from'))}</p>
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

function SectionHeader({ title, label: sectionLabel, href, cta }: {
  title: string; label?: string; href: string; cta: string
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
  const { t } = useLanguage()
  const [data, setData] = useState<HomeData | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [allServices, setAllServices] = useState<Service[]>([])
  const [booking, setBooking] = useState<{ serviceId: number | null; time: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('products')
  const [search, setSearch] = useState('')
  const [todaySlots, setTodaySlots] = useState<PublicSlot[]>([])

  const todayKey = nairobiDateKey()
  const todayLabel = nairobiDayLabel()

  const TABS: { key: Tab; labelKey: string }[] = [
    { key: 'products', labelKey: 'home.tabBeauty' },
    { key: 'handbags', labelKey: 'home.tabHandbags' },
    { key: 'clothes', labelKey: 'home.tabClothing' },
  ]

  const TESTIMONIALS = [
    { nameKey: 'home.t1Name', roleKey: 'home.t1Role', textKey: 'home.t1Text', initials: 'SM', color: 'bg-primary text-primary-foreground' },
    { nameKey: 'home.t2Name', roleKey: 'home.t2Role', textKey: 'home.t2Text', initials: 'GK', color: 'bg-inverse text-inverse-foreground' },
    { nameKey: 'home.t3Name', roleKey: 'home.t3Role', textKey: 'home.t3Text', initials: 'MW', color: 'bg-gold-tint text-gold-ink' },
  ]

  // Reviews added by the admin; the built-in samples above show until there is at least one.
  const [reviews, setReviews] = useState<{ id: number; customer_name: string; customer_label: string; text: string; rating: number }[]>([])
  useEffect(() => { api.get('/reviews/').then(r => setReviews(r.data)).catch(() => {}) }, [])
  const REVIEW_COLORS = ['bg-primary text-primary-foreground', 'bg-inverse text-inverse-foreground', 'bg-gold-tint text-gold-ink']
  const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
  const shownReviews = reviews.length > 0
    ? reviews.slice(0, 6).map((r, i) => ({
        key: `r${r.id}`, name: r.customer_name, role: r.customer_label, text: r.text, rating: r.rating,
        initials: initialsOf(r.customer_name), color: REVIEW_COLORS[i % REVIEW_COLORS.length],
      }))
    : TESTIMONIALS.map(x => ({
        key: x.nameKey, name: t(x.nameKey), role: t(x.roleKey), text: t(x.textKey), rating: 5,
        initials: x.initials, color: x.color,
      }))

  useEffect(() => {
    Promise.all([
      api.get('/home/').then(r => r.data),
      api.get('/services/').then(r => r.data).catch(() => []),
      api.get<PublicSlot[]>(`/reservations/public-slots/?date=${todayKey}`).then(r => r.data).catch(() => []),
    ]).then(([homeData, svcData, slots]) => {
      setData(homeData)
      setServices(svcData.slice(0, 2))
      setAllServices(svcData)
      setTodaySlots(slots)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Sparkles size={24} className="text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  const heroImages: string[] = (data?.featured_products ?? [])
    .map(p => p.image)
    .filter((x): x is string => !!x)
    .slice(0, 4)

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

  const features = [
    { Icon: Truck, titleKey: 'home.feature1Title', descKey: 'home.feature1Desc' },
    { Icon: ShieldCheck, titleKey: 'home.feature2Title', descKey: 'home.feature2Desc' },
    { Icon: Sparkles, titleKey: 'home.feature3Title', descKey: 'home.feature3Desc' },
    { Icon: Headphones, titleKey: 'home.feature4Title', descKey: 'home.feature4Desc' },
  ]

  return (
    <div className="overflow-hidden">
      <ShopStatusWatch />

      {/* ═══ HERO ════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[90vh] flex items-center gradient-hero overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-5 py-16 sm:py-24 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

            {/* Left, copy */}
            <div className="max-w-xl">
              <img src={LOGO_URL} alt="Kenrish Collection" className="hidden lg:block h-40 w-auto object-contain mb-6" />

              <h1
                className="text-5xl lg:text-[3.75rem] font-semibold leading-[1.07] mb-6 text-foreground"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {t('home.heroTitle')}<br />
                <em className="not-italic text-gradient-plum">{t('home.heroAccent')}</em>
              </h1>

              <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                {t('home.heroSubtitle')}
              </p>

              <div className="flex flex-wrap gap-4 mb-14">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-all"
                >
                  {t('home.shopNow')} <ChevronRight size={15} />
                </Link>
                <Link
                  to="/services"
                  className="inline-flex items-center gap-2 px-8 py-3.5 border-2 border-primary/30 text-primary rounded-full font-medium hover:bg-secondary transition-all"
                >
                  {t('home.bookService')}
                </Link>
              </div>

            </div>

            {/* Right, image mosaic (tablet + desktop) */}
            <div className="hidden md:grid grid-cols-2 gap-3 h-[440px] lg:h-[560px]">
              {heroImages.length >= 2 ? (
                <>
                  <div className="flex flex-col gap-3 hero-float">
                    <div className="rounded-2xl overflow-hidden flex-1 bg-muted">
                      {heroImages[0] && (
                        <img src={heroImages[0]} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    {heroImages[2] && (
                      <div className="rounded-2xl overflow-hidden h-32 lg:h-40 bg-muted shrink-0">
                        <img src={heroImages[2]} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 pt-6 lg:pt-8 hero-float-delay">
                    {heroImages[1] && (
                      <div className="rounded-2xl overflow-hidden h-36 lg:h-44 bg-muted shrink-0">
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
                /* Decorative fallback when no product images exist yet */
                <div className="col-span-2 rounded-3xl overflow-hidden relative bg-gradient-to-br from-primary/15 via-accent/10 to-secondary border border-primary/20 flex flex-col items-center justify-center gap-5 p-8">
                  <div className="absolute inset-0 opacity-20"
                    style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(212,142,192,0.5) 0%, transparent 70%)' }} />
                  <Sparkles size={48} className="text-primary/60 relative z-10" />
                  <div className="text-center relative z-10">
                    <p className="text-sm font-semibold text-primary">New Collection</p>
                    <p className="text-xs text-muted-foreground mt-1">Premium Fashion &amp; Beauty</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full relative z-10">
                    {['Beauty', 'Handbags', 'Clothing', 'Services'].map(label => (
                      <div key={label} className="rounded-xl bg-primary/8 border border-primary/15 py-3 text-center">
                        <span className="text-xs font-medium text-primary/70">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-28 pointer-events-none hero-fade-bottom" />
      </section>

      {/* ═══ TODAY'S OPENINGS, phones get it right under the hero ═════════ */}
      <section className="lg:hidden px-4 pt-2 pb-12">
        <TodaySchedule dateKey={todayKey} slots={todaySlots} services={allServices} dateLabel={todayLabel} onBook={setBooking} />
      </section>

      {/* ═══ PROMO STRIP ════════════════════════════════════════════════ */}
      <div className="hidden sm:block bg-primary text-primary-foreground py-3 px-5 overflow-hidden">
        <div className="flex items-center justify-center gap-8 text-sm font-medium flex-wrap">
          <span>{t('home.promoProducts')}</span>
          <span className="hidden sm:block">{t('home.promoConsultations')}</span>
          <span className="hidden md:block">{t('home.promoBookings')}</span>
          <span>{t('home.promoHours')}</span>
        </div>
      </div>

      {/* ═══ TWO SHOPS ══════════════════════════════════════════════════ */}
      <section className="py-20 px-5 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary mb-2.5 tracking-[0.18em] uppercase">One Boutique, Two Worlds</p>
            <h2
              className="text-3xl lg:text-4xl font-semibold"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Explore Kenrish
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                key: 'beauty', Icon: Scissors, title: 'Kenrish Beauty', href: '/beauty',
                blurb: 'Hairdressing, barbering, nails and manicures, plus the beauty products to keep it up at home.',
                cta: 'Explore Beauty',
              },
              {
                key: 'fashion', Icon: Shirt, title: 'Kenrish Fashion', href: '/fashion',
                blurb: 'Handbags and attire, curated for every season.',
                cta: 'Explore Fashion',
              },
            ].map(shop => (
              <div
                key={shop.key}
                className="rounded-2xl overflow-hidden border border-border p-9 flex flex-col bg-card text-card-foreground card-hover"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <shop.Icon size={26} className="mb-5" style={{ color: 'var(--gold-ink)' }} />
                <h3
                  className="text-2xl font-semibold mb-3"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {shop.title}
                </h3>
                <p className="text-sm opacity-75 leading-relaxed mb-7 flex-1">{shop.blurb}</p>
                <Link
                  to={shop.href}
                  className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity w-fit"
                >
                  {shop.cta} <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COLLECTIONS, tabbed ══════════════════════════════════════ */}
      {(data?.featured_products?.length || data?.featured_handbags?.length || data?.featured_clothes?.length) ? (
        <section className="py-20 max-w-7xl mx-auto px-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
            <div>
              <p className="text-xs font-semibold text-primary mb-2.5 tracking-[0.18em] uppercase">
                {t('home.curatedForYou')}
              </p>
              <h2
                className="text-3xl lg:text-4xl font-semibold text-foreground leading-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {t('home.ourCollections')}
              </h2>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 flex-wrap">
              {TABS.map(({ key, labelKey }) => (
                <button
                  key={key}
                  onClick={() => { setActiveTab(key); setSearch('') }}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeTab === key
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                      : 'bg-secondary text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-8 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or description…"
              className="w-full pl-10 pr-9 py-2.5 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {(() => {
            const q = search.trim().toLowerCase()
            const filtered = q
              ? tabItems[activeTab].filter(i =>
                  i.name.toLowerCase().includes(q) ||
                  i.description?.toLowerCase().includes(q)
                )
              : tabItems[activeTab]
            return filtered.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {(q ? filtered : filtered.slice(0, 8)).map(item => (
                    <ItemCard key={item.id} item={item} href={tabHrefs[activeTab](item.id)} />
                  ))}
                </div>
                {!q && (
                  <div className="text-center mt-10">
                    <Link
                      to={tabViewAll[activeTab]}
                      className="inline-flex items-center gap-2 px-7 py-3 border border-border rounded-full text-sm font-medium hover:bg-secondary transition-colors"
                    >
                      {t('home.viewAllBtn')} {t(TABS.find(tab => tab.key === activeTab)?.labelKey ?? '')}
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground py-16">
                {q ? `No results for "${search}"` : t('home.noItems')}
              </p>
            )
          })()}
        </section>
      ) : null}

      {/* ═══ CLOTHING BANNER ════════════════════════════════════════════ */}
      {data?.featured_clothes && data.featured_clothes.length > 0 && (
        <section className="py-24 max-w-7xl mx-auto px-6">
          <div className="relative rounded-3xl overflow-hidden min-h-[380px] flex items-center" style={{ background: 'var(--sidebar)' }}>
            <img
              src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1400&h=700&fit=crop&auto=format"
              alt="Clothing boutique interior"
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, color-mix(in srgb, var(--sidebar) 92%, transparent) 0%, color-mix(in srgb, var(--sidebar) 65%, transparent) 55%, transparent 100%)' }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 25%, transparent), transparent 60%, color-mix(in srgb, var(--accent) 18%, transparent))' }} />

            <div className="relative px-10 md:px-16 py-16 max-w-lg">
              <p className="text-xs font-semibold mb-3 tracking-[0.18em] uppercase" style={{ color: 'var(--sidebar-primary)' }}>
                {t('home.newThisSeason')}
              </p>
              <h2
                className="text-4xl lg:text-5xl font-semibold leading-tight mb-5"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", color: 'var(--sidebar-foreground)' }}
              >
                {t('home.clothingTitle')}
              </h2>
              <p className="text-sm leading-relaxed mb-8" style={{ color: 'color-mix(in srgb, var(--sidebar-foreground) 70%, transparent)' }}>
                {t('home.clothingDesc')}
              </p>
              <Link
                to="/clothes"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-full font-medium text-sm hover:opacity-90 transition-opacity shadow-xl"
              >
                {t('home.exploreClothing')} <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══ FEATURE STRIP ══════════════════════════════════════════════ */}
      <section className="py-12 border-y border-border">
        <div className="max-w-7xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-6">
          {features.map(({ Icon, titleKey, descKey }) => (
            <div key={titleKey} className="flex flex-col gap-2">
              <Icon size={18} className="text-primary" />
              <h4 className="font-semibold text-sm text-foreground">{t(titleKey)}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ SERVICES PREVIEW ══════════════════════════════════════════ */}
      {services.length > 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-secondary/40 dark:bg-secondary/20" />

          <div className="relative max-w-7xl mx-auto px-5">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold text-primary mb-2.5 tracking-[0.18em] uppercase">
                {t('home.expertCare')}
              </p>
              <h2
                className="text-3xl lg:text-4xl font-semibold mb-4"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {t('home.beautyServices')}
              </h2>
              <p className="text-muted-foreground max-w-xs mx-auto text-sm leading-relaxed">
                {t('home.servicesSubtitle')}
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
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-primary/20 to-transparent" />
                      <div className="absolute bottom-4 left-5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md text-white border border-white/20">
                          <Scissors size={10} />
                          {t('common.professional')}
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
                      <span className="product-price font-bold text-base">
                        {svc.price_from
                          ? svc.price_to
                            ? `${formatKES(svc.price_from)} – ${formatKES(svc.price_to)}`
                            : `From ${formatKES(svc.price_from)}`
                          : svc.price ? formatKES(svc.price) : ''}
                      </span>
                      <Link
                        to="/services"
                        className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline underline-offset-2"
                      >
                        {t('common.learnMore')} <ChevronRight size={12} />
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
                {t('home.viewAllServices')} <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══ ACTIVE OFFERS ══════════════════════════════════════════════ */}
      {data?.offers && data.offers.length > 0 && (
        <section className="py-20 px-5 bg-background">
          <div className="max-w-7xl mx-auto">
            <SectionHeader
              title={t('home.currentOffers')}
              label={t('home.limitedTime')}
              href="/offers"
              cta={t('home.allOffers')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.offers.slice(0, 3).map(offer => (
                <div key={offer.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card card-hover">
                  {offer.image && (
                    <div className="h-52 overflow-hidden">
                      <img
                        src={offer.image}
                        alt={offer.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 product-tag shadow-md">
                    {formatKES(offer.offer_price)}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-foreground">{offer.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{offer.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ TESTIMONIALS ═══════════════════════════════════════════════ */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-muted/30 dark:bg-transparent" />
        <div className="relative max-w-7xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary mb-2.5 tracking-[0.18em] uppercase">
              {t('home.clientLove')}
            </p>
            <h2
              className="text-3xl lg:text-4xl font-semibold"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {t('home.whatTheySay')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {shownReviews.map(testimonial => (
              <div
                key={testimonial.key}
                className="rounded-2xl p-7 border border-border bg-card hover:shadow-xl hover:shadow-primary/8 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex gap-1 mb-5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={13} className={i <= testimonial.rating ? 'text-gold' : 'text-muted-foreground/40'} fill={i <= testimonial.rating ? 'currentColor' : 'none'} />
                  ))}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6 italic">
                  &ldquo;{testimonial.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${testimonial.color} flex items-center justify-center text-xs font-bold shrink-0`}>
                    {testimonial.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">{testimonial.name}</div>
                    {testimonial.role && <div className="text-xs text-muted-foreground">{testimonial.role}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BOOK YOUR SPOT (desktop; phones see Today's openings under the hero) ═══ */}
      <section className="hidden lg:block py-20 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl overflow-hidden border border-border grid grid-cols-1 lg:grid-cols-2 shadow-2xl shadow-primary/10">

            {/* Left, copy */}
            <div
              className="relative p-10 lg:p-14 overflow-hidden bg-primary text-primary-foreground"
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' }}
            >
              <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary-foreground/5 pointer-events-none" />
              <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-primary-foreground/5 pointer-events-none" />

              <div className="relative">
                <p className="text-xs font-semibold text-primary-foreground/60 mb-3 tracking-[0.18em] uppercase">
                  {t('home.appointments')}
                </p>
                <h2
                  className="text-3xl lg:text-4xl font-semibold text-primary-foreground mb-5 leading-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {t('home.bookSpotL1')}<br />{t('home.bookSpotL2')}
                </h2>
                <p className="text-primary-foreground/75 text-sm leading-relaxed mb-8 max-w-sm">
                  {t('home.bookingDesc')}
                </p>

                <ul className="space-y-3 mb-10">
                  {[
                    t('home.booking30min'),
                    t('home.bookingWalkIn'),
                    t('home.bookingServices'),
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-primary-foreground/90">
                      <CheckCircle2 size={14} className="text-primary-foreground/60 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/reservation"
                    className="inline-flex items-center gap-2.5 bg-primary-foreground text-primary px-7 py-3 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity shadow-xl"
                  >
                    <CalendarDays size={14} />
                    {t('home.viewFullCalendar')}
                  </Link>
                  <a
                    href="tel:+254708440390"
                    className="inline-flex items-center gap-2.5 border border-primary-foreground/30 text-primary-foreground px-7 py-3 rounded-full font-semibold text-sm hover:bg-primary-foreground/10 transition-colors"
                  >
                    <Phone size={14} />
                    {t('common.callUs')}
                  </a>
                </div>
              </div>
            </div>

            {/* Right, today's openings */}
            <div className="bg-card">
              <TodaySchedule bare dateKey={todayKey} slots={todaySlots} services={allServices} dateLabel={todayLabel} onBook={setBooking} />
            </div>

          </div>
        </div>
      </section>

      {booking && (
        <BookingModal
          services={allServices}
          initialServiceId={booking.serviceId ?? undefined}
          initialDate={todayKey}
          initialTime={booking.time}
          onClose={() => setBooking(null)}
        />
      )}
    </div>
  )
}
