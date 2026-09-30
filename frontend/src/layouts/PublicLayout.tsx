import { useState, useEffect, useRef, type FormEvent } from 'react'
import { Link, Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  Menu, X, Sun, Moon, Heart, MapPin, Phone, Clock, Search, ChevronRight, ChevronDown,
  UserRound, ClipboardList, KeyRound, LogOut, ShieldCheck, Wallet, CalendarDays,
  ShoppingBag, Images, Info, Package, Shirt,
} from 'lucide-react'
import api from '@/lib/axios'
import { LOGO_URL } from '@/lib/brand'
import { STORES, SEARCH_CATEGORIES, SHOP_PHONE, SHOP_PHONE_TEL, storeForPath } from '@/lib/stores'
import StoreSwitcher from '@/components/layout/StoreSwitcher'
import type { Offer } from '@/lib/types'

/** Wishlist size for the header counter; refreshed on every navigation. */
function useWishlistCount(enabled: boolean, pathname: string) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    api.get('/wishlist/')
      .then(r => {
        if (!alive) return
        const w = r.data ?? {}
        setCount((w.products?.length ?? 0) + (w.handbags?.length ?? 0) + (w.clothes?.length ?? 0))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [enabled, pathname])
  return enabled ? count : 0
}

function SearchForm({ compact = false, onDone }: { compact?: boolean; onDone?: () => void }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const defaultCat = SEARCH_CATEGORIES.find(c => pathname.includes(c.value))?.value
    ?? (storeForPath(pathname) === 'fashion' ? '/clothes' : '/products')
  // Reset to the current section's category when the route changes section.
  const [picked, setPicked] = useState<{ from: string; cat: string } | null>(null)
  const cat = picked && picked.from === defaultCat ? picked.cat : defaultCat
  const setCat = (c: string) => setPicked({ from: defaultCat, cat: c })
  const [q, setQ] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    navigate(q.trim() ? `${cat}?search=${encodeURIComponent(q.trim())}` : cat)
    setQ('')
    onDone?.()
  }

  return (
    <form role="search" onSubmit={submit}
      className="flex items-center h-11 w-full rounded-full bg-secondary border border-transparent focus-within:border-border-control transition-colors">
      <label className="sr-only" htmlFor={compact ? 'm-search-cat' : 'search-cat'}>{t('search.all')}</label>
      <div className="relative shrink-0 h-full flex items-center pl-1">
        <select
          id={compact ? 'm-search-cat' : 'search-cat'}
          value={cat}
          onChange={e => setCat(e.target.value)}
          className="appearance-none h-9 pl-3.5 pr-8 rounded-full bg-card border border-border text-[13px] font-semibold text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {SEARCH_CATEGORIES.map(c => <option key={c.value} value={c.value}>{t(c.labelKey)}</option>)}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-muted-foreground" />
      </div>
      <Search size={16} className="ml-3 shrink-0 text-muted-foreground" />
      <input
        type="search"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder={t('search.placeholder')}
        aria-label={t('nav.search')}
        autoFocus={compact}
        className="flex-1 min-w-0 h-full bg-transparent px-2.5 text-base lg:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      <button type="submit" className="sr-only">{t('search.go')}</button>
    </form>
  )
}

function CountBubble({ n }: { n: number }) {
  if (!n) return null
  return (
    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-[18px] text-center">
      {n > 99 ? '99+' : n}
    </span>
  )
}

function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; label: string
  options: { value: T; label: string; icon?: React.ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-flow-col auto-cols-fr p-1 rounded-full bg-secondary">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-10 rounded-full flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors
            ${value === o.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  )
}

/** Right-hand menu drawer for phones: Shop / Your account / Preferences. */
function MobileDrawer({ onClose, wishCount, hasOffers }: { onClose: () => void; wishCount: number; hasOffers: boolean }) {
  const { isAuthenticated, user, logout } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const { lang, setLang, t } = useLanguage()
  const { pathname } = useLocation()
  const active = storeForPath(pathname)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  const row = 'flex items-center gap-3 h-12 px-3 rounded-xl text-[15px] text-foreground hover:bg-secondary transition-colors'
  const group = 'px-3 pt-4 pb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground'

  const shopLinks = [
    { to: '/beauty/services', label: t('nav.bookAppointment'), Icon: CalendarDays },
    { to: '/beauty/products', label: t('search.beautyProducts'), Icon: Package },
    { to: '/clothes', label: t('nav.clothes'), Icon: Shirt },
    { to: '/handbags', label: t('nav.handbags'), Icon: ShoppingBag },
    { to: hasOffers ? '/offers' : '/beauty/gallery', label: hasOffers ? t('nav.galleryOffers') : t('nav.gallery'), Icon: Images },
    { to: '/about', label: t('nav.about'), Icon: Info },
  ]

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={t('nav.menu')}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 w-[86%] max-w-sm bg-card shadow-2xl flex flex-col drawer-right-enter">
        {/* Who */}
        <div className="flex items-center gap-3 px-4 h-[72px] border-b border-border shrink-0">
          <div className="w-10 h-10 rounded-full bg-gold-tint text-gold-ink flex items-center justify-center font-semibold font-heading">
            {isAuthenticated ? user?.username?.[0]?.toUpperCase() : <UserRound size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            {isAuthenticated ? (
              <>
                <p className="font-semibold text-sm truncate">{user?.username}</p>
                <Link to="/profile" className="text-xs font-semibold text-gold-ink">{t('nav.viewProfile')}</Link>
              </>
            ) : (
              <>
                <p className="font-semibold text-sm">{t('nav.guest')}</p>
                <p className="text-xs text-muted-foreground truncate">{t('nav.signInPrompt')}</p>
              </>
            )}
          </div>
          <button ref={closeRef} onClick={onClose} aria-label={t('nav.closeMenu')}
            className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-secondary">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          <p className={group}>{t('nav.shop')}</p>
          {STORES.map(({ id, labelKey, href, icon: Icon }) => (
            <Link key={id} to={href}
              className={`${row} ${id === active ? 'bg-gold-tint font-semibold' : ''}`}
              aria-current={id === active ? 'page' : undefined}>
              <Icon size={18} strokeWidth={1.75} />
              <span className="flex-1">{t(labelKey)}</span>
              {id === active
                ? <span className="text-xs font-semibold text-gold-ink">{t('nav.youAreHere')}</span>
                : <ChevronRight size={16} className="text-muted-foreground" />}
            </Link>
          ))}
          <div className="my-1 mx-3 border-t border-border" />
          {shopLinks.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `${row} ${isActive ? 'font-semibold' : ''}`}>
              <Icon size={18} strokeWidth={1.75} className="text-muted-foreground" />
              <span className="flex-1">{label}</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </NavLink>
          ))}

          <p className={group}>{t('nav.yourAccount')}</p>
          {isAuthenticated ? (
            <>
              <Link to="/wishlist" className={row}>
                <Heart size={18} strokeWidth={1.75} className="text-muted-foreground" />
                <span className="flex-1">{t('nav.wishlist')}</span>
                {wishCount > 0 && <span className="min-w-6 h-6 px-2 rounded-full bg-primary text-primary-foreground text-xs font-bold leading-6 text-center">{wishCount}</span>}
              </Link>
              <Link to="/orders" className={row}>
                <ClipboardList size={18} strokeWidth={1.75} className="text-muted-foreground" />
                <span className="flex-1">{t('nav.orders')}</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </Link>
              <Link to="/change-password" className={row}>
                <KeyRound size={18} strokeWidth={1.75} className="text-muted-foreground" />
                <span className="flex-1">{t('nav.changePassword')}</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </Link>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 px-1 pt-1">
              <Link to="/login" className="h-11 rounded-full border border-border-control flex items-center justify-center text-sm font-semibold">{t('nav.signIn')}</Link>
              <Link to="/signup" className="h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">{t('nav.createAccount')}</Link>
            </div>
          )}

          <p className={group}>{t('nav.preferences')}</p>
          <div className="grid grid-cols-2 gap-2 px-1">
            <Segmented label="Language" value={lang} onChange={setLang}
              options={[{ value: 'en', label: 'EN' }, { value: 'sw', label: 'SW' }]} />
            <Segmented label="Appearance" value={theme} onChange={v => { if (v !== theme) toggleTheme() }}
              options={[
                { value: 'light', label: t('nav.light'), icon: <Sun size={14} /> },
                { value: 'dark', label: t('nav.dark'), icon: <Moon size={14} /> },
              ]} />
          </div>
        </nav>

        <div className="border-t border-border px-4 pt-3 pb-4 pb-safe space-y-2 shrink-0">
          {isAuthenticated && user?.is_staff && (
            <Link to="/admin" className="h-11 rounded-full border border-border-control flex items-center justify-center gap-2 text-sm font-semibold hover:bg-secondary">
              <ShieldCheck size={16} /> {t('nav.adminPanel')}
            </Link>
          )}
          {isAuthenticated && (
            <button onClick={() => { logout(); onClose() }}
              className="w-full h-11 rounded-full flex items-center justify-center gap-2 text-sm font-semibold text-danger hover:bg-danger-tint transition-colors">
              <LogOut size={16} /> {t('nav.logout')}
            </button>
          )}
          <p className="text-center text-xs text-muted-foreground leading-5">
            Shabaab, Nakuru · {t('footer.hours')} · <a href={SHOP_PHONE_TEL} className="underline underline-offset-2">{SHOP_PHONE}</a>
          </p>
        </div>
      </aside>
    </div>
  )
}

export default function PublicLayout() {
  const { isAuthenticated, user } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const { lang, setLang, t } = useLanguage()
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  // Menus remember the URL they were opened on, so navigating closes them.
  const here = location.pathname + location.search
  const [menuAt, setMenuAt] = useState<string | null>(null)
  const [searchAt, setSearchAt] = useState<string | null>(null)
  const menuOpen = menuAt === here
  const searchOpen = searchAt === here
  const setMenuOpen = (open: boolean) => setMenuAt(open ? here : null)
  const store = storeForPath(location.pathname)
  const wishCount = useWishlistCount(isAuthenticated, location.pathname)
  const [hasActiveOffers, setHasActiveOffers] = useState(false)

  useEffect(() => {
    api.get<Offer[]>('/offers/').then(r => setHasActiveOffers(r.data.length > 0)).catch(() => {})
  }, [])

  const navLinks = [
    { to: '/beauty/products', label: t('search.beautyProducts') },
    { to: '/beauty/services', label: t('nav.services') },
    { to: '/clothes', label: t('nav.clothes') },
    { to: '/handbags', label: t('nav.handbags') },
    { to: '/beauty/gallery', label: t('nav.gallery') },
    ...(hasActiveOffers ? [{ to: '/offers', label: t('nav.offers') }] : []),
    { to: '/about', label: t('nav.about') },
  ]

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const iconBtn = 'relative w-11 h-11 flex items-center justify-center rounded-full text-foreground hover:bg-secondary transition-colors'

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ── Desktop utility bar: store switcher + visit details ───────── */}
      <div className="hidden lg:block bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <StoreSwitcher active={store} />
          <div className="flex items-center gap-5 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin size={14} strokeWidth={1.75} />Shabaab, Nakuru</span>
            <span className="flex items-center gap-1.5"><Clock size={14} strokeWidth={1.75} />{t('footer.hours')}</span>
            <a href={SHOP_PHONE_TEL} className="flex items-center gap-1.5 hover:text-foreground"><Phone size={14} strokeWidth={1.75} />{SHOP_PHONE}</a>
            <span className="w-px h-5 bg-border" />
            <button onClick={() => setLang(lang === 'en' ? 'sw' : 'en')}
              className="h-8 px-3 rounded-full hover:bg-card font-semibold text-foreground"
              aria-label={lang === 'en' ? 'Switch to Swahili' : 'Switch to English'}>
              {lang === 'en' ? 'SW' : 'EN'}
            </button>
            <button onClick={toggleTheme} className="w-8 h-8 rounded-full hover:bg-card flex items-center justify-center text-foreground" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border transition-shadow ${scrolled ? 'shadow-sm' : ''}`}>
        {/* Desktop */}
        <div className="hidden lg:flex max-w-7xl mx-auto px-6 h-[76px] items-center gap-6">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img src={LOGO_URL} alt="" className="w-11 h-11 rounded-lg object-cover bg-black" />
            <span className="leading-tight">
              <span className="block font-heading text-xl font-semibold">Kenrish</span>
              <span className="block text-xs text-muted-foreground">Collection · Nakuru</span>
            </span>
          </Link>
          <div className="flex-1 max-w-2xl"><SearchForm /></div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="h-10 px-3.5 rounded-full border border-border flex items-center gap-1.5 text-[13px] font-bold" title="Prices in Kenyan Shillings">
              <Wallet size={15} strokeWidth={1.75} /> KES
            </span>
            <Link to="/wishlist" className={iconBtn} aria-label={`${t('nav.wishlist')}${wishCount ? `, ${wishCount}` : ''}`}>
              <Heart size={19} strokeWidth={1.75} />
              <CountBubble n={wishCount} />
            </Link>
            {isAuthenticated ? (
              <>
                {user?.is_staff && (
                  <Link to="/admin" className="h-10 px-4 rounded-full border border-border-control flex items-center gap-1.5 text-[13px] font-semibold hover:bg-secondary">
                    <ShieldCheck size={15} /> {t('nav.admin')}
                  </Link>
                )}
                <Link to="/profile" className="h-11 pl-1 pr-4 rounded-full border border-border flex items-center gap-2 hover:bg-secondary">
                  <span className="w-9 h-9 rounded-full bg-inverse text-inverse-foreground flex items-center justify-center text-sm font-bold">
                    {user?.username?.[0]?.toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold max-w-[120px] truncate">{user?.username}</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="h-10 px-4 flex items-center text-sm font-semibold hover:text-gold-ink">{t('nav.signIn')}</Link>
                <Link to="/signup" className="h-10 px-5 rounded-full bg-inverse text-inverse-foreground flex items-center text-sm font-semibold hover:opacity-90">{t('nav.join')}</Link>
              </>
            )}
          </div>
        </div>

        {/* Desktop category row (the Beauty section has its own sub-menu) */}
        <div className={`${location.pathname.startsWith('/beauty') ? 'hidden' : 'hidden lg:block'} border-t border-border`}>
          <div className="max-w-7xl mx-auto px-6 h-12 flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) => `h-9 px-3.5 rounded-full flex items-center text-sm transition-colors ${
                  isActive ? 'bg-gold-tint text-gold-ink font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                {label}
              </NavLink>
            ))}
            <Link to="/beauty/services" className="ml-auto h-9 px-5 rounded-full bg-primary text-primary-foreground flex items-center gap-2 text-sm font-semibold hover:bg-gold-deep transition-colors">
              <CalendarDays size={15} /> {t('nav.bookAppointment')}
            </Link>
          </div>
        </div>

        {/* Phone: 60px bar */}
        <div className="lg:hidden h-[60px] px-4 flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2.5 mr-auto">
            <img src={LOGO_URL} alt="" className="w-9 h-9 rounded-lg object-cover bg-black" />
            <span className="font-heading text-lg font-semibold">Kenrish</span>
          </Link>
          <button className={iconBtn} onClick={() => setSearchAt(searchOpen ? null : here)} aria-label={t('nav.search')} aria-expanded={searchOpen}>
            {searchOpen ? <X size={20} strokeWidth={1.75} /> : <Search size={20} strokeWidth={1.75} />}
          </button>
          <Link to="/wishlist" className={iconBtn} aria-label={`${t('nav.wishlist')}${wishCount ? `, ${wishCount}` : ''}`}>
            <Heart size={20} strokeWidth={1.75} />
            <CountBubble n={wishCount} />
          </Link>
          <button className={iconBtn} onClick={() => setMenuOpen(true)} aria-label={t('nav.menu')} aria-expanded={menuOpen}>
            <Menu size={21} strokeWidth={1.75} />
          </button>
        </div>
        {searchOpen && (
          <div className="lg:hidden px-4 pb-3 mobile-menu-enter"><SearchForm compact onDone={() => setSearchAt(null)} /></div>
        )}
        {/* Phone: store tabs always visible */}
        <div className="lg:hidden px-4 py-2 border-t border-border bg-background">
          <StoreSwitcher active={store} variant="tabs" />
        </div>
      </header>

      {menuOpen && <MobileDrawer onClose={() => setMenuOpen(false)} wishCount={wishCount} hasOffers={hasActiveOffers} />}

      <main className="flex-1">
        <Outlet />
      </main>

      <SiteFooter hasOffers={hasActiveOffers} />
    </div>
  )
}

function SiteFooter({ hasOffers }: { hasOffers: boolean }) {
  const { t } = useLanguage()
  const groups = [
    {
      title: t('footer.shop'),
      links: [
        { to: '/beauty/products', label: t('footer.beautyProducts') },
        { to: '/fashion', label: t('store.fashion') },
        { to: '/handbags', label: t('footer.handbags') },
        { to: '/clothes', label: t('footer.clothing') },
        ...(hasOffers ? [{ to: '/offers', label: t('footer.currentOffers') }] : []),
      ],
    },
    {
      title: t('footer.services'),
      links: [
        { to: '/beauty/services', label: t('footer.hairdressing') },
        { to: '/beauty/services', label: t('footer.nailCare') },
        { to: '/beauty/services', label: t('footer.barbershop') },
        { to: '/beauty/reservations', label: t('nav.bookAppointment') },
      ],
    },
    {
      title: t('footer.company'),
      links: [
        { to: '/about', label: t('footer.aboutUs') },
        { to: '/beauty/gallery', label: t('footer.gallery') },
        { to: '/privacy-policy', label: t('footer.privacy') },
        { to: '/terms-of-service', label: t('footer.terms') },
      ],
    },
  ]
  const link = 'text-sm text-muted-foreground hover:text-gold-ink transition-colors'

  return (
    <footer className="border-t border-border bg-card mt-12">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-10 lg:pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-10 mb-8 md:mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={LOGO_URL} alt="Kenrish Collection" className="w-12 h-12 rounded-lg object-cover bg-black" />
              <span className="font-heading text-xl font-semibold">Kenrish Collection</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-xs">{t('footer.tagline')}</p>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2.5"><MapPin size={15} strokeWidth={1.75} className="text-gold-ink shrink-0" />Shabaab, Nakuru, Kenya</li>
              <li className="flex items-center gap-2.5"><Clock size={15} strokeWidth={1.75} className="text-gold-ink shrink-0" />{t('footer.hours')}</li>
              <li className="flex items-center gap-2.5"><Phone size={15} strokeWidth={1.75} className="text-gold-ink shrink-0" />
                <a href={SHOP_PHONE_TEL} className="hover:text-gold-ink">{SHOP_PHONE}</a>
              </li>
            </ul>
          </div>

          {/* Desktop: open columns */}
          {groups.map(g => (
            <div key={g.title} className="hidden md:block">
              <p className="font-semibold text-sm mb-4">{g.title}</p>
              <ul className="space-y-2.5">
                {g.links.map(l => <li key={l.label}><Link to={l.to} className={link}>{l.label}</Link></li>)}
              </ul>
            </div>
          ))}

          {/* Phone: accordions */}
          <div className="md:hidden border-y border-border divide-y divide-border">
            {groups.map(g => (
              <details key={g.title} className="group">
                <summary className="flex items-center justify-between h-12 cursor-pointer list-none font-semibold text-sm [&::-webkit-details-marker]:hidden">
                  {g.title}
                  <ChevronDown size={16} className="text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <ul className="pb-3 space-y-1">
                  {g.links.map(l => <li key={l.label}><Link to={l.to} className={`${link} flex items-center h-10`}>{l.label}</Link></li>)}
                </ul>
              </details>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          <div className="flex gap-5">
            <Link to="/privacy-policy" className="text-xs text-muted-foreground hover:text-gold-ink">{t('footer.privacyShort')}</Link>
            <Link to="/terms-of-service" className="text-xs text-muted-foreground hover:text-gold-ink">{t('footer.termsShort')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
