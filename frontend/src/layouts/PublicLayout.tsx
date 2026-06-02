import { useState, useEffect } from 'react'
import { Link, Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Menu, X, Sun, Moon, Heart, MapPin, Phone, Clock } from 'lucide-react'
import { LOGO_URL } from '@/lib/brand'

const navLinks = [
  { to: '/products', label: 'Products' },
  { to: '/handbags', label: 'Handbags' },
  { to: '/clothes', label: 'Clothes' },
  { to: '/services', label: 'Services' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/offers', label: 'Offers' },
  { to: '/reservation', label: 'Reservations' },
  { to: '/about', label: 'About' },
]

export default function PublicLayout() {
  const { isAuthenticated, user, logout } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

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
      {/* Announcement bar */}
      <div className="bg-primary text-primary-foreground text-center text-xs py-2 px-4 tracking-wide font-medium">
        ✦ Free beauty consultations · Mon–Sat 8AM–8PM · Shabaab, Nakuru · 0708 440390 ✦
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
            <img src={LOGO_URL} alt="Kenrish Collection" className="h-10 w-auto object-contain" />
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
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
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
                    Admin
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
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="hidden sm:block text-sm px-5 py-2 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all shadow-md"
                >
                  Join
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
                {isAuthenticated ? (
                  <>
                    {user?.is_staff && (
                      <Link to="/admin" className="px-4 py-2.5 rounded-xl text-sm text-primary hover:bg-primary/10 transition-colors">
                        Admin Panel
                      </Link>
                    )}
                    <Link to="/wishlist" className="px-4 py-2.5 rounded-xl text-sm text-foreground/80 hover:bg-muted transition-colors">
                      ♡ My Wishlist
                    </Link>
                    <Link to="/orders" className="px-4 py-2.5 rounded-xl text-sm text-foreground/80 hover:bg-muted transition-colors">
                      📦 My Orders
                    </Link>
                    <button onClick={logout} className="text-left px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="px-4 py-2.5 rounded-xl text-sm text-foreground/80 hover:bg-muted transition-colors">Sign in</Link>
                    <Link to="/signup" className="px-4 py-2.5 rounded-xl text-sm text-center mt-1 bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all">
                      Create account
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

      {/* Footer — light background matching Figma */}
      <footer className="border-t border-border bg-background mt-8">
        <div className="max-w-7xl mx-auto px-5 pt-14 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand column */}
            <div className="sm:col-span-2 md:col-span-1">
              <img src={LOGO_URL} alt="Kenrish Collection" className="h-12 w-auto object-contain mb-3" />
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-[220px]">
                Premium fashion &amp; cosmetics boutique in the heart of Nakuru, Kenya.
              </p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <MapPin size={12} className="text-primary shrink-0" />
                  Shabaab, Nakuru, Kenya
                </li>
                <li className="flex items-center gap-2">
                  <Clock size={12} className="text-primary shrink-0" />
                  Mon–Sat 8AM–8PM
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={12} className="text-primary shrink-0" />
                  <a href="tel:+254708440390" className="hover:text-primary transition-colors">0708 440390</a>
                </li>
              </ul>
            </div>

            {/* Shop links */}
            <div>
              <p className="font-semibold text-sm mb-4 text-foreground">Shop</p>
              <ul className="space-y-2.5">
                {[
                  { to: '/products', label: 'Beauty Products' },
                  { to: '/handbags', label: 'Handbags' },
                  { to: '/clothes', label: 'Clothing' },
                  { to: '/offers', label: 'Current Offers' },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link to={to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services links */}
            <div>
              <p className="font-semibold text-sm mb-4 text-foreground">Services</p>
              <ul className="space-y-2.5">
                {[
                  { to: '/services', label: 'Hairdressing' },
                  { to: '/services', label: 'Nail Care' },
                  { to: '/services', label: 'Barbershop' },
                  { to: '/services', label: 'Beauty Consult' },
                ].map(({ to, label }, i) => (
                  <li key={i}>
                    <Link to={to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company links */}
            <div>
              <p className="font-semibold text-sm mb-4 text-foreground">Company</p>
              <ul className="space-y-2.5">
                {[
                  { to: '/about', label: 'About Us' },
                  { to: '/gallery', label: 'Gallery' },
                  { to: '/privacy-policy', label: 'Privacy Policy' },
                  { to: '/terms-of-service', label: 'Terms of Service' },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link to={to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Kenrish Collection. All rights reserved.</p>
            <div className="flex gap-5">
              <Link to="/privacy-policy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms-of-service" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
