import { Link } from 'react-router-dom'
import { STORES, type StoreId } from '@/lib/stores'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * The three-store selector. `variant="bar"` is the desktop utility bar pill group;
 * `variant="tabs"` is the full-width, equal-width row under the phone header.
 */
export default function StoreSwitcher({ active, variant = 'bar' }: { active: StoreId | null; variant?: 'bar' | 'tabs' }) {
  const { t } = useLanguage()
  const tabs = variant === 'tabs'
  return (
    <nav
      aria-label="Stores"
      className={tabs
        ? 'grid grid-cols-3 gap-1 p-1 rounded-full bg-secondary'
        : 'inline-flex gap-1 p-1 rounded-full bg-card border border-border'}
    >
      {STORES.map(({ id, labelKey, shortKey, href, icon: Icon }) => {
        const on = id === active
        return (
          <Link
            key={id}
            to={href}
            aria-current={on ? 'page' : undefined}
            className={`flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors whitespace-nowrap
              ${tabs ? 'h-10 text-[13px]' : 'h-9 px-4 text-sm'}
              ${on ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-gold-tint'}`}
          >
            <Icon size={tabs ? 14 : 15} strokeWidth={1.75} />
            {t(tabs ? shortKey : labelKey)}
          </Link>
        )
      })}
    </nav>
  )
}
