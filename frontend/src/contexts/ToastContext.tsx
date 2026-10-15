import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { CheckCircle2, AlertTriangle, Info, X, Undo2, RotateCw, type LucideIcon } from 'lucide-react'

type ToastTone = 'success' | 'info' | 'danger'

export interface ToastOptions {
  title: string
  description?: string
  tone?: ToastTone
  icon?: LucideIcon
  /** One action, e.g. Undo or Retry. */
  action?: { label: string; onClick: () => void }
  /** Milliseconds before it fades. 0 keeps it until closed (the default for errors). */
  duration?: number
}

interface Toast extends ToastOptions {
  id: number
  tone: ToastTone
}

interface ToastApi {
  error: (message: string, action?: { label: string; onClick: () => void }) => void
  success: (message: string, action?: { label: string; onClick: () => void }) => void
  show: (options: ToastOptions) => number
  dismiss: (id: number) => void
}

const MAX_TOASTS = 3
const DEFAULT_MS = 4500
const WITH_ACTION_MS = 7000

const ToastContext = createContext<ToastApi | null>(null)

const TONE: Record<ToastTone, { icon: LucideIcon; iconClass: string }> = {
  success: { icon: CheckCircle2, iconClass: 'text-success' },
  info: { icon: Info, iconClass: 'text-gold-ink' },
  danger: { icon: AlertTriangle, iconClass: 'text-danger' },
}

/** One toast. Its timer pauses while it is hovered or focused. */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false)
  const remaining = useRef(toast.duration ?? 0)
  const started = useRef(0)

  useEffect(() => {
    if (!remaining.current || paused) return
    started.current = Date.now()
    const timer = setTimeout(() => onDismiss(toast.id), remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current = Math.max(0, remaining.current - (Date.now() - started.current))
    }
  }, [paused, toast.id, onDismiss])

  const { icon: ToneIcon, iconClass } = TONE[toast.tone]
  const Icon = toast.icon ?? ToneIcon
  const ActionIcon = /retry|try again/i.test(toast.action?.label ?? '') ? RotateCw : Undo2

  return (
    <div
      role={toast.tone === 'danger' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex items-start gap-3 p-3.5 pr-2.5 rounded-2xl bg-card text-card-foreground border border-border shadow-[0_24px_64px_rgba(40,25,10,.22)] animate-in fade-in slide-in-from-bottom-2"
    >
      <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${toast.tone === 'danger' ? 'bg-danger-tint' : 'bg-gold-tint'}`}>
        <Icon size={16} strokeWidth={1.9} className={iconClass} />
      </span>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-semibold leading-snug">{toast.title}</p>
        {toast.description && <p className="text-[13px] text-muted-foreground leading-snug mt-0.5">{toast.description}</p>}
      </div>
      {toast.action && (
        <button
          onClick={() => { toast.action!.onClick(); onDismiss(toast.id) }}
          className="shrink-0 self-center flex items-center gap-1 h-8 px-3 rounded-full text-[13px] font-semibold text-gold-ink hover:bg-gold-tint transition-colors"
        >
          <ActionIcon size={13} /> {toast.action.label}
        </button>
      )}
      <button onClick={() => onDismiss(toast.id)} aria-label="Dismiss"
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary">
        <X size={15} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const show = useCallback((options: ToastOptions) => {
    const id = nextId.current++
    const tone = options.tone ?? 'success'
    const duration = options.duration ?? (tone === 'danger' ? 0 : options.action ? WITH_ACTION_MS : DEFAULT_MS)
    // Never more than three at once: the oldest makes room.
    setToasts(t => [...t, { ...options, id, tone, duration }].slice(-MAX_TOASTS))
    return id
  }, [])

  const api: ToastApi = {
    show,
    dismiss,
    error: (message, action) => show({ title: message, tone: 'danger', action }),
    success: (message, action) => show({ title: message, tone: 'success', action }),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Bottom-right on desktop; full width above the safe area on phones. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed z-[100] inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-5 sm:bottom-5 flex flex-col gap-2 sm:w-[380px]"
      >
        {toasts.map(toast => <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be within ToastProvider')
  return ctx
}
