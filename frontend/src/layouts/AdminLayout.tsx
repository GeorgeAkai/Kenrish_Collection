import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { LOGO_URL } from '@/lib/brand'
import {
  Package, ShoppingBag, Shirt, Warehouse,
  Scissors, Image, Tag, Users, FileText, LogOut, Menu, X,
  Sun, Moon, ChevronRight, ChevronDown, CalendarCheck, ClipboardList, Settings2, PackagePlus,
  TrendingUp, ArrowRight, BarChart3, Receipt, Tags, Activity, MessageSquareQuote, Wallet,
} from 'lucide-react'

interface NavLeaf { to: string; label: string; icon: LucideIcon; end?: boolean }
interface NavGroup { label: string; icon: LucideIcon; children: NavLeaf[] }
type NavEntry = ({ kind: 'leaf' } & NavLeaf) | ({ kind: 'group' } & NavGroup)

const NAV: NavEntry[] = [
  { kind: 'leaf', to: '/admin/executive', label: 'Executive Dashboard', icon: TrendingUp, end: true },
  { kind: 'leaf', to: '/admin/expenses', label: 'All Expenses', icon: Wallet },
  // Orders can hold items from any shop, so it lives at the top level rather than under one store.
  { kind: 'leaf', to: '/admin/orders', label: 'Customer Orders', icon: ClipboardList },
  {
    kind: 'group', label: 'Kenrish Beauty Dashboard', icon: Scissors,
    children: [
      { to: '/admin/beauty/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/admin/products', label: 'Products', icon: Package },
      { to: '/admin/services', label: 'Services', icon: Scissors },
      { to: '/admin/beauty/service-sales', label: 'Service Sales', icon: Receipt },
      { to: '/admin/beauty/staging', label: 'Draft Products', icon: PackagePlus },
      { to: '/admin/reservations', label: 'Reservations', icon: CalendarCheck },
      { to: '/admin/beauty/gallery', label: 'Gallery', icon: Image },
      { to: '/admin/beauty/inventory', label: 'Inventory', icon: Warehouse },
      { to: '/admin/beauty/expenses', label: 'Expenses', icon: Wallet },
    ],
  },
  {
    kind: 'group', label: 'Kenrish Fashion', icon: Shirt,
    children: [
      { to: '/admin/fashion/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/admin/clothes', label: 'Clothes', icon: Shirt },
      { to: '/admin/fashion/categories', label: 'Clothes Categories', icon: Tags },
      { to: '/admin/handbags', label: 'Handbags', icon: ShoppingBag },
      { to: '/admin/fashion/inventory', label: 'Inventory', icon: Warehouse },
      { to: '/admin/fashion/gallery', label: 'Gallery', icon: Image },
      { to: '/admin/fashion/expenses', label: 'Expenses', icon: Wallet },
    ],
  },
  { kind: 'leaf', to: '/admin/offers', label: 'Offers', icon: Tag },
  { kind: 'leaf', to: '/admin/reviews', label: 'Customer Reviews', icon: MessageSquareQuote },
  { kind: 'leaf', to: '/admin/invoices', label: 'Invoices', icon: FileText },
  { kind: 'leaf', to: '/admin/slot-config', label: 'Service Time Settings', icon: Settings2 },
  {
    kind: 'group', label: 'Users', icon: Users,
    children: [
      { to: '/admin/users', label: 'All Users', icon: Users, end: true },
      { to: '/admin/users/activity', label: 'Activity Logs', icon: Activity },
    ],
  },
]

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/executive': 'Executive Dashboard',
  '/admin/expenses': 'All Expenses',
  '/admin/beauty/expenses': 'Beauty Expenses',
  '/admin/fashion/expenses': 'Fashion Expenses',
  '/admin/dashboard-legacy': 'Dashboard (Legacy)',
  '/admin/products': 'Products',
  '/admin/handbags': 'Handbags',
  '/admin/clothes': 'Clothes',
  '/admin/inventory': 'Inventory',
  '/admin/staging': 'Draft Products',
  '/admin/orders': 'Customer Orders',
  '/admin/services': 'Services',
  '/admin/reservations': 'Reservations',
  '/admin/slot-config': 'Service Time Settings',
  '/admin/gallery': 'Gallery',
  '/admin/offers': 'Offers',
  '/admin/reviews': 'Customer Reviews',
  '/admin/users': 'Users',
  '/admin/users/activity': 'Activity Logs',
  '/admin/invoices': 'Invoices',
  '/admin/beauty/analytics': 'Beauty Analytics',
  '/admin/beauty/service-sales': 'Service Sales',
  '/admin/beauty/staging': 'Beauty Draft Products',
  '/admin/beauty/gallery': 'Beauty Gallery',
  '/admin/beauty/inventory': 'Beauty Inventory',
  '/admin/fashion/analytics': 'Fashion Analytics',
  '/admin/fashion/categories': 'Clothes Categories',
  '/admin/fashion/inventory': 'Fashion Inventory',
  '/admin/fashion/gallery': 'Fashion Gallery',
}

export function getAdminPageTitle(pathname: string): string {
  return PAGE_TITLES[pathname] ?? 'Admin'
}

function groupContainsPath(group: NavGroup, pathname: string) {
  return group.children.some(c => pathname === c.to || pathname.startsWith(c.to + '/'))
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const entry of NAV) {
      if (entry.kind === 'group' && groupContainsPath(entry, location.pathname)) initial.add(entry.label)
    }
    return initial
  })

  useEffect(() => {
    for (const entry of NAV) {
      if (entry.kind === 'group' && groupContainsPath(entry, location.pathname)) {
        setOpenGroups(prev => prev.has(entry.label) ? prev : new Set(prev).add(entry.label))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  function toggleGroup(label: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  function handleLogout() {
    logout()
    navigate('/login')
    onClose?.()
  }

  return (
    <aside className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border w-72 lg:w-64">
      {/* Brand */}
      <div className="h-16 flex items-center justify-between gap-2 px-4 border-b border-sidebar-border shrink-0">
        <Link to="/" className="flex items-center gap-3 min-w-0" onClick={onClose}>
          <img src={LOGO_URL} alt="" className="w-10 h-10 rounded-lg object-cover bg-black shrink-0" />
          <span className="leading-tight">
            <span className="block font-heading text-lg font-semibold text-white">Kenrish</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-primary">Admin</span>
          </span>
        </Link>
        {onClose && (
          <button onClick={onClose} aria-label="Close menu" autoFocus
            className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center text-sidebar-muted hover:bg-sidebar-accent hover:text-white">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-0.5">
        {NAV.map(entry => {
          if (entry.kind === 'leaf') {
            return (
              <NavLink
                key={entry.to}
                to={entry.to}
                end={entry.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 h-11 lg:h-10 px-3 rounded-xl text-sm transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
                      : 'text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute -left-3 top-2.5 bottom-2.5 w-[3px] rounded-r bg-sidebar-primary" />}
                    <entry.icon size={17} strokeWidth={1.75} />
                    <span className="flex-1">{entry.label}</span>
                  </>
                )}
              </NavLink>
            )
          }

          const open = openGroups.has(entry.label)
          const active = groupContainsPath(entry, location.pathname)
          return (
            <div key={entry.label}>
              <button
                onClick={() => toggleGroup(entry.label)}
                aria-expanded={open}
                className={`w-full flex items-center gap-3 h-11 lg:h-10 px-3 rounded-xl text-sm transition-colors ${
                  active ? 'text-white font-semibold' : 'text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-white'
                }`}
              >
                <entry.icon size={17} strokeWidth={1.75} className={active ? 'text-sidebar-primary' : ''} />
                <span className="flex-1 text-left">{entry.label}</span>
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {open && (
                <div className="ml-4 pl-3 border-l border-sidebar-border space-y-0.5 mt-0.5 mb-1">
                  {entry.children.map(child => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      end={child.end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 h-10 lg:h-9 px-3 rounded-lg text-[13px] transition-colors ${
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
                            : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-white'
                        }`
                      }
                    >
                      {() => (
                        <>
                          <child.icon size={15} strokeWidth={1.75} />
                          <span className="flex-1">{child.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-4 py-3 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 leading-tight">
          <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
          <p className="text-xs text-sidebar-muted truncate">Admin · all stores</p>
        </div>
        <button onClick={toggle} aria-label="Toggle theme"
          className="w-9 h-9 flex items-center justify-center rounded-full text-sidebar-muted hover:bg-sidebar-accent hover:text-white">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button onClick={handleLogout} aria-label="Log out" title="Log out"
          className="w-9 h-9 flex items-center justify-center rounded-full text-sidebar-muted hover:bg-sidebar-accent hover:text-white">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}

export default function AdminLayout() {
  const location = useLocation()
  const pageTitle = getAdminPageTitle(location.pathname)
  // The drawer remembers the page it was opened on, so navigating closes it.
  const [drawerAt, setDrawerAt] = useState<string | null>(null)
  const sidebarOpen = drawerAt === location.pathname
  const setSidebarOpen = (open: boolean) => setDrawerAt(open ? location.pathname : null)

  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerAt(null) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [sidebarOpen])

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 h-screen">
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 sidebar-drawer-enter shadow-2xl">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 lg:h-16 border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-30 flex items-center px-3 sm:px-4 lg:px-7 gap-2 sm:gap-3">
          <button
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
            <span className="hidden lg:inline text-muted-foreground">Admin</span>
            <ChevronRight size={14} className="hidden lg:inline text-muted-foreground" />
            <h1 className="font-semibold text-foreground truncate">{pageTitle}</h1>
          </nav>
          <div className="flex-1" />
          <Link to="/" className="flex items-center gap-1.5 text-sm font-semibold text-gold-ink hover:underline underline-offset-2">
            View store <ArrowRight size={14} />
          </Link>
        </header>

        <main className="flex-1 p-4 lg:p-7 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
