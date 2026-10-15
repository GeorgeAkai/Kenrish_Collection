import { useState, type ReactNode } from 'react'
import { Info, CheckCircle2, AlertTriangle, OctagonAlert, CalendarClock, X, type LucideIcon } from 'lucide-react'

type AlertTone = 'info' | 'success' | 'warning' | 'danger' | 'gold'

const TONES: Record<AlertTone, { box: string; icon: LucideIcon; iconClass: string }> = {
  info: { box: 'bg-card border-border', icon: Info, iconClass: 'text-foreground' },
  success: { box: 'bg-success-tint border-transparent', icon: CheckCircle2, iconClass: 'text-success' },
  warning: { box: 'bg-warning-tint border-transparent', icon: AlertTriangle, iconClass: 'text-warning' },
  danger: { box: 'bg-danger-tint border-transparent', icon: OctagonAlert, iconClass: 'text-danger' },
  gold: { box: 'bg-gold-tint border-transparent', icon: CalendarClock, iconClass: 'text-gold-ink' },
}

/**
 * Inline message tied to one part of a page or form; it stays until the problem is solved
 * (or the person dismisses it). Warnings and errors are announced to screen readers at once.
 */
export default function Alert({ tone = 'info', title, children, icon, actions, dismissible = false, onDismiss, className = '' }: {
  tone?: AlertTone
  title?: string
  children?: ReactNode
  icon?: LucideIcon
  actions?: ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}) {
  const [hidden, setHidden] = useState(false)
  if (hidden) return null
  const t = TONES[tone]
  const Icon = icon ?? t.icon
  const urgent = tone === 'warning' || tone === 'danger'

  return (
    <div role={urgent ? 'alert' : 'status'} className={`flex gap-3 rounded-2xl border p-4 ${t.box} ${className}`}>
      <Icon size={20} strokeWidth={1.9} className={`shrink-0 mt-0.5 ${t.iconClass}`} />
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold leading-snug">{title}</p>}
        {children && <div className={`text-sm leading-relaxed text-foreground/80 ${title ? 'mt-0.5' : ''}`}>{children}</div>}
        {actions && <div className="flex flex-wrap gap-2 mt-3">{actions}</div>}
      </div>
      {dismissible && (
        <button onClick={() => { setHidden(true); onDismiss?.() }} aria-label="Dismiss"
          className="shrink-0 -mt-1 -mr-1 w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10">
          <X size={16} />
        </button>
      )}
    </div>
  )
}
