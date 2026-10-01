import type { LucideIcon } from 'lucide-react'

/** Executive KPI tile. `accent` renders the dark espresso lead card. */
export default function KpiCard({ label, value, hint, icon: Icon, accent, tone, onClick }: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  accent?: boolean
  tone?: 'up' | 'down'
  /** Makes the whole card a button (e.g. to open a breakdown). */
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`rounded-[20px] p-4 lg:p-5 border min-w-0 ${onClick ? 'text-left w-full cursor-pointer hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' : ''}${accent
      ? 'bg-inverse text-inverse-foreground border-transparent'
      : 'bg-card border-border shadow-card'}`}>
      <div className="flex items-start justify-between gap-2 mb-2 lg:mb-3">
        <p className={`text-xs lg:text-sm font-semibold leading-tight ${accent ? 'opacity-80' : 'text-muted-foreground'}`}>{label}</p>
        <span className={`hidden sm:flex w-9 h-9 rounded-full items-center justify-center shrink-0 ${accent ? 'bg-primary text-primary-foreground' : 'bg-gold-tint text-gold-ink'}`}>
          <Icon size={17} strokeWidth={1.75} />
        </span>
      </div>
      <p className={`text-lg sm:text-2xl lg:text-[28px] font-bold tracking-tight tabular-nums leading-tight break-words ${
        tone === 'up' && !accent ? 'text-success' : tone === 'down' ? 'text-danger' : ''}`}>{value}</p>
      {hint && <p className={`text-xs mt-1.5 ${accent ? 'opacity-75' : 'text-muted-foreground'}`}>{hint}</p>}
    </Tag>
  )
}
