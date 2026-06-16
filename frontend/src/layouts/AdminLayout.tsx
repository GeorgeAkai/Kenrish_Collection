import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { LOGO_URL } from '@/lib/brand'
import {
  LayoutDashboard, Package, ShoppingBag, Shirt, Warehouse,
  Scissors, Image, Tag, Users, FileText, LogOut, Menu, X,
  Sun, Moon, ChevronRight, CalendarCheck, ClipboardList, Settings2, PackagePlus,
} from 'lucide-react'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/handbags', label: 'Handbags', icon: ShoppingBag },
  { to: '/admin/clothes', label: 'Clothes', icon: Shirt },
  { to: '/admin/inventory', label: 'Inventory', icon: Warehouse },
  { to: '/admin/staging', label: 'Draft Products', icon: PackagePlus },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/services', label: 'Services', icon: Scissors },
  { to: '/admin/reservations', label: 'Reservations', icon: CalendarCheck },
  { to: '/admin/slot-config', label: 'Schedule Settings', icon: Settings2 },
  { to: '/admin/gallery', label: 'Gallery', icon: Image },
  { to: '/admin/offers', label: 'Offers', icon: Tag },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/invoices', label: 'Invoices', icon: FileText },
]

export function getAdminPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/admin': 'Dashboard',
    '/admin/products': 'Products',
    '/admin/handbags': 'Handbags',
    '/admin/clothes': 'Clothes',
    '/admin/inventory': 'Inventory',
    '/admin/staging': 'Draft Products',
    '/admin/orders': 'Orders',
    '/admin/services': 'Services',
    '/admin/reservations': 'Reservations',
    '/admin/slot-config': 'Schedule Settings',
    '/admin/gallery': 'Gallery',
    '/admin/offers': 'Offers',
    '/admin/users': 'Users',
    '/admin/invoices': 'Invoices',
  }
  return titles[pathname] ?? 'Admin'
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
    onClose?.()
  }

  return (
    <aside className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-64">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0">
        <Link to="/" className="flex items-center gap-2" onClick={onClose}>
          <img src={LOGO_URL} alt="Kenrish Collection" className="h-12 w-auto object-contain" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Admin</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-0.5">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-primary' : ''} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-primary" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4 space-y-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.username}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-red-500/80 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 py-1 rounded-lg transition-colors"
          >
            <LogOut size={13} /> Logout
          </button>
          <button
            onClick={toggle}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>
    </aside>
  )
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const pageTitle = getAdminPageTitle(location.pathname)

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 h-screen">
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden sidebar-drawer-enter">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 lg:h-16 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30 flex items-center px-4 lg:px-6 gap-3">
          <button
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>
          <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
          <div className="flex-1" />
          <Link
            to="/"
            className="text-xs text-muted-foreground hover:text-primary transition-colors hidden sm:block"
          >
            ← View store
          </Link>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
