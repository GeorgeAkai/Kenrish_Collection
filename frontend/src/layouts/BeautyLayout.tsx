import { NavLink, Outlet } from 'react-router-dom'
import { Sparkles, Scissors, Image, CalendarDays } from 'lucide-react'

const SUBNAV = [
  { to: '/beauty/products', label: 'Beauty Products', icon: Sparkles },
  { to: '/beauty/services', label: 'Beauty Services', icon: Scissors },
  { to: '/beauty/gallery', label: 'Gallery', icon: Image },
  { to: '/beauty/reservations', label: 'Reservations', icon: CalendarDays },
]

export default function BeautyLayout() {
  return (
    <div>
      <div className="border-b border-border bg-card/60 sticky top-20 z-30 backdrop-blur-sm">
        <nav className="max-w-6xl mx-auto px-5 flex gap-1 overflow-x-auto no-scrollbar">
          {SUBNAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <Icon size={14} /> {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  )
}
