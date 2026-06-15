import { useState, useEffect } from 'react'
import { Link, Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Menu, X, Sun, Moon, Heart, MapPin, Phone, Clock, Globe } from 'lucide-react'
import { LOGO_URL } from '@/lib/brand'

export default function PublicLayout() {
  const { isAuthenticated, user, logout } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const { lang, setLang, t } = useLanguage()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  const navLinks = [
    { to: '/products', label: t('nav.products') },
    { to: '/handbags', label: t('nav.handbags') },
    { to: '/clothes', label: t('nav.clothes') },
    { to: '/services', label: t('nav.services') },
    { to: '/gallery', label: t('nav.gallery') },
    { to: '/offers', label: t('nav.offers') },
    { to: '/reservation', label: t('nav.reservations') },
    { to: '/about', label: t('nav.about') },
  ]

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Announcement bar — scrolling marquee */}
      <div className="bg-primary text-primary-foreground py-2.5 overflow-hidden select-none">
        <div className="marquee-track">
          {[
            t('announce.products'),
            t('announce.consultations'),
            t('announce.bookings'),
            t('announce.hours'),
            t('announce.call'),
            t('announce.products'),
            t('announce.consultations'),
            t('announce.bookings'),
            t('announce.hours'),
            t('announce.call'),
          ].map((text, i) => (
            <span key={i} className="text-xs font-medium px-10 whitespace-nowrap">{text}</span>
          ))}
        </div>
      </div>

      {/* Header */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/95 backdrop-blur-lg shadow-sm border-b border-border'
            : 'bg-background/80 backdrop-blur-sm border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="shrink-0 select-none">
            <img src={LOGO_URL} alt="Kenrish Collection" className="h-14 w-auto object-contain" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-sm transition-colors ${
                    isActive
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors duration-200'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'en' ? 'sw' : 'en')}
              className="flex items-center gap-1 px-2.5 h-9 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-all text-xs font-semibold text-muted-foreground"
              aria-label={lang === 'en' ? 'Switch to Swahili' : 'Switch to English'}
              title={lang === 'en' ? 'Switch to Swahili' : 'Switch to English'}
            >
              <Globe size={13} />
              {t('nav.switchLang')}
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-all text-muted-foreground"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {isAuthenticated ? (
              <>
                {user?.is_staff && (
                  <Link
                    to="/admin"
                    className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    {t('nav.admin')}
                  </Link>
                )}
                <Link
                  to="/wishlist"
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                  aria-label="Wishlist"
                >
                  <Heart size={17} />
                </Link>
                <button
                  onClick={logout}
                  className="hidden sm:block text-xs px-4 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
                >
                  {t('nav.signIn')}
                </Link>
                <Link
                  to="/signup"
                  className="hidden sm:block text-sm px-5 py-2 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all shadow-md"
                >
                  {t('nav.join')}
                </Link>
              </>
            )}

            {/* Hamburger */}
            <button
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border bg-card/95 backdrop-blur-xl mobile-menu-enter">
            <nav className="max-w-7xl mx-auto px-5 py-4 flex flex-col gap-0.5">
              {navLinks.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-4 py-2.5 rounded-xl text-sm transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground/80 hover:bg-muted'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
              <div className="border-t border-border mt-2 pt-2 flex flex-col gap-0.5">
                {/* Language toggle in mobile menu */}
                <button
                  onClick={() => setLang(lang === 'en' ? 'sw' : 'en')}
                  className="px-4 py-2.5 rounded-xl text-sm text-foreground/80 hover:bg-muted transition-colors text-left flex items-center gap-2"
                >
                  <Globe size={14} />
                  {t('nav.switchLang')}
                </button>

                {isAuthenticated ? (
                  <>
                    {user?.is_staff && (
                      <Link to="/admin" className="px-4 py-2.5 rounded-xl text-sm text-primary hover:bg-primary/10 transition-colors">
                        {t('nav.adminPanel')}
                      </Link>
                    )}
                    <Link to="/wishlist" className="px-4 py-2.5 rounded-xl text-sm text-foreground/80 hover:bg-muted transition-colors">
                      {t('nav.wishlist')}
                    </Link>
                    <Link to="/orders" className="px-4 py-2.5 rounded-xl text-sm text-foreground/80 hover:bg-muted transition-colors">
                      {t('nav.orders')}
                    </Link>
                    <Link to="/change-password" className="px-4 py-2.5 rounded-xl text-sm text-foreground/80 hover:bg-muted transition-colors">
                      {t('nav.changePassword')}
                    </Link>
                    <button onClick={logout} className="text-left px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                      {t('nav.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="px-4 py-2.5 rounded-xl text-sm text-foreground/80 hover:bg-muted transition-colors">
                      {t('nav.signIn')}
                    </Link>
                    <Link to="/signup" className="px-4 py-2.5 rounded-xl text-sm text-center mt-1 bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all">
                      {t('nav.createAccount')}
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background mt-8">
        <div className="max-w-7xl mx-auto px-5 pt-14 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand column */}
            <div className="sm:col-span-2 md:col-span-1">
              <img src={LOGO_URL} alt="Kenrish Collection" className="h-16 w-auto object-contain mb-3" />
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-[220px]">
                {t('footer.tagline')}
              </p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <MapPin size={12} className="text-primary shrink-0" />
                  Shabaab, Nakuru, Kenya
                </li>
                <li className="flex items-center gap-2">
                  <Clock size={12} className="text-primary shrink-0" />
                  {t('footer.hours')}
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={12} className="text-primary shrink-0" />
                  <a href="tel:+254708440390" className="hover:text-primary transition-colors">0708 440390</a>
                </li>
              </ul>
            </div>

            {/* Shop links */}
            <div>
              <p className="font-semibold text-sm mb-4 text-foreground">{t('footer.shop')}</p>
              <ul className="space-y-2.5">
                {[
                  { to: '/products', label: t('footer.beautyProducts') },
                  { to: '/handbags', label: t('footer.handbags') },
                  { to: '/clothes', label: t('footer.clothing') },
                  { to: '/offers', label: t('footer.currentOffers') },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link to={to} className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services links */}
            <div>
              <p className="font-semibold text-sm mb-4 text-foreground">{t('footer.services')}</p>
              <ul className="space-y-2.5">
                {[
                  t('footer.hairdressing'),
                  t('footer.nailCare'),
                  t('footer.barbershop'),
                  t('footer.beautyConsult'),
                ].map((label, i) => (
                  <li key={i}>
                    <Link to="/services" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company links */}
            <div>
              <p className="font-semibold text-sm mb-4 text-foreground">{t('footer.company')}</p>
              <ul className="space-y-2.5">
                {[
                  { to: '/about', label: t('footer.aboutUs') },
                  { to: '/gallery', label: t('footer.gallery') },
                  { to: '/privacy-policy', label: t('footer.privacy') },
                  { to: '/terms-of-service', label: t('footer.terms') },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link to={to} className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {t('footer.copyright', { year: new Date().getFullYear() })}
            </p>
            <div className="flex gap-5">
              <Link to="/privacy-policy" className="text-xs text-muted-foreground hover:text-primary transition-colors duration-200">
                {t('footer.privacyShort')}
              </Link>
              <Link to="/terms-of-service" className="text-xs text-muted-foreground hover:text-primary transition-colors duration-200">
                {t('footer.termsShort')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
