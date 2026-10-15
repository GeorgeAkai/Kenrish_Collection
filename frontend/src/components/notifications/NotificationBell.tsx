import { useContext, useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell, BellOff, CalendarCheck, CalendarClock, PackageCheck, ShoppingBag, ClipboardCheck,
  CalendarX, Boxes, BarChart3, ShieldCheck, X, Check, CheckCheck, ArrowRight, type LucideIcon,
} from 'lucide-react'
import api from '@/lib/axios'
import { useToast } from '@/contexts/ToastContext'
import {
  useNotifications, useMarkRead, timeAgo, isToday, NOTIFICATIONS_KEY,
  type AppNotification, type NotificationKind,
} from '@/lib/notifications'
import { QueryClientContext } from '@tanstack/react-query'
import { fallbackQueryClient } from '@/lib/queryClient'

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  booking: CalendarCheck,
  reminder: CalendarClock,
  stock: PackageCheck,
  order: ShoppingBag,
  approval: ClipboardCheck,
  cancel: CalendarX,
  inventory: Boxes,
  data: BarChart3,
  security: ShieldCheck,
}

const UNDO_MS = 6000

/** "9+" once the unread count passes nine. Counts unread items only. */
function badge(n: number) {
  return n > 9 ? '9+' : String(n)
}

function Item({ n, admin, onOpen, onDecided }: {
  n: AppNotification
  admin: boolean
  onOpen: (n: AppNotification) => void
  onDecided: (n: AppNotification) => void
}) {
  const Icon = KIND_ICON[n.kind] ?? Bell
  const toast = useToast()
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null)
  const canDecide = admin && n.kind === 'approval' && n.unread && n.ref_type === 'reservation' && n.ref_id

  async function decide(status: 'APPROVED' | 'REJECTED') {
    if (!n.ref_id) return
    if (status === 'APPROVED') {
      setBusy('approve')
      try {
        await api.patch(`/admin/reservations/${n.ref_id}/`, { status })
        toast.show({ title: 'Booking approved', description: 'The customer has been told.', icon: CalendarCheck })
        onDecided(n)
      } catch {
        toast.show({ title: 'Couldn’t approve the booking', description: 'Check your connection and try again.', tone: 'danger',
          action: { label: 'Retry', onClick: () => decide(status) } })
      } finally { setBusy(null) }
      return
    }
    // Declining waits a few seconds so it can be undone, instead of asking "Are you sure?".
    setBusy('decline')
    let undone = false
    const id = toast.show({
      title: 'Booking declined', description: 'The customer will be offered other times.', tone: 'info', icon: CalendarX,
      duration: UNDO_MS, action: { label: 'Undo', onClick: () => { undone = true; setBusy(null) } },
    })
    setTimeout(async () => {
      if (undone) return
      try {
        await api.patch(`/admin/reservations/${n.ref_id}/`, { status })
        onDecided(n)
      } catch {
        toast.dismiss(id)
        toast.show({ title: 'Couldn’t decline the booking', tone: 'danger' })
      } finally { setBusy(null) }
    }, UNDO_MS)
  }

  return (
    <li className={`relative rounded-xl ${n.priority && n.unread ? 'bg-gold-tint' : ''}`}>
      <div className="flex gap-3 p-3">
        {n.thumb ? (
          <img src={n.thumb} alt="" className="w-11 h-11 rounded-lg object-cover bg-muted shrink-0" />
        ) : (
          <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${n.priority && n.unread ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
            <Icon size={18} strokeWidth={1.75} />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <p className={`flex-1 text-sm leading-snug ${n.unread ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>{n.title}</p>
            {n.unread && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" aria-label="Unread" />}
          </div>
          {n.body && <p className="text-[13px] text-muted-foreground leading-snug mt-0.5">{n.body}</p>}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
            {n.priority && n.unread && (
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gold-ink">Priority</span>
            )}
          </div>
          {canDecide ? (
            <div className="flex gap-2 mt-2.5">
              <button onClick={() => decide('APPROVED')} disabled={!!busy}
                className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold flex items-center gap-1.5 hover:bg-gold-deep disabled:opacity-60">
                <Check size={14} /> {busy === 'approve' ? 'Approving…' : 'Approve'}
              </button>
              <button onClick={() => decide('REJECTED')} disabled={!!busy}
                className="h-9 px-4 rounded-full border border-border-control text-[13px] font-semibold hover:bg-secondary disabled:opacity-60">
                {busy === 'decline' ? 'Declining…' : 'Decline'}
              </button>
              <button onClick={() => onOpen(n)} className="h-9 px-2 text-[13px] font-semibold text-gold-ink hover:underline">
                Details
              </button>
            </div>
          ) : n.link && (
            <button onClick={() => onOpen(n)}
              className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-semibold text-gold-ink hover:underline underline-offset-2">
              {n.action_label || 'View'} <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

/**
 * Bell with an unread badge that opens the notification centre: All / Unread tabs,
 * Today and Earlier groups, one next step per item, Mark all read. Admins can approve or
 * decline a booking right inside the notification. Full screen on phones.
 */
export default function NotificationBell({ audience = 'customer', className = '' }: {
  audience?: 'customer' | 'admin'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<CSSProperties>({})
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const inbox = useNotifications(true)
  const markRead = useMarkRead()
  const navigate = useNavigate()
  const client = useContext(QueryClientContext) ?? fallbackQueryClient
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const unread = inbox.data?.unread_count ?? 0
  const items = (inbox.data?.results ?? []).filter(n => tab === 'all' || n.unread)
  const today = items.filter(n => isToday(n.created_at))
  const earlier = items.filter(n => !isToday(n.created_at))

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus() } }
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    panelRef.current?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick) }
  }, [open])

  function openItem(n: AppNotification) {
    if (n.unread) markRead.mutate([n.id])
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  function decided(n: AppNotification) {
    markRead.mutate([n.id])
    client.invalidateQueries({ queryKey: ['admin'] })
    client.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
  }

  const group = (label: string, list: AppNotification[]) => list.length > 0 && (
    <section>
      <p className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <ul className="space-y-1">
        {list.map(n => <Item key={n.id} n={n} admin={audience === 'admin'} onOpen={openItem} onDecided={decided} />)}
      </ul>
    </section>
  )

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => {
          // The panel is portalled out of the (blurred, sticky) header, so place it under the bell by hand.
          const r = buttonRef.current?.getBoundingClientRect()
          if (r) setAnchor({ top: r.bottom + 8, right: Math.max(12, window.innerWidth - r.right) })
          setOpen(o => !o)
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative w-11 h-11 flex items-center justify-center rounded-full text-foreground hover:bg-secondary transition-colors"
      >
        <Bell size={20} strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-[18px] text-center">
            {badge(unread)}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={anchor}
          role="dialog"
          aria-label="Notifications"
          tabIndex={-1}
          className="fixed max-sm:!inset-0 z-[70] bg-card flex flex-col sm:w-[400px] sm:max-h-[min(640px,80vh)] sm:rounded-2xl sm:border sm:border-border sm:shadow-[0_24px_64px_rgba(40,25,10,.22)] outline-none animate-in fade-in"
        >
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border shrink-0">
            <h2 className="font-heading text-xl font-semibold flex-1">Notifications</h2>
            {unread > 0 && (
              <button onClick={() => markRead.mutate('all')}
                className="h-9 px-3 rounded-full text-[13px] font-semibold text-gold-ink hover:bg-gold-tint flex items-center gap-1.5">
                <CheckCheck size={15} /> Mark all read
              </button>
            )}
            <button onClick={() => setOpen(false)} aria-label="Close notifications"
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary">
              <X size={18} />
            </button>
          </div>

          <div role="tablist" aria-label="Filter" className="grid grid-cols-2 gap-1 mx-4 mt-3 p-1 rounded-full bg-secondary shrink-0">
            {(['all', 'unread'] as const).map(t => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`h-9 rounded-full text-sm font-semibold transition-colors ${tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                {t === 'all' ? 'All' : `Unread${unread ? ` (${badge(unread)})` : ''}`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-1 pb-2 pb-safe">
            {inbox.isPending ? (
              <p className="text-center text-sm text-muted-foreground py-12">Loading…</p>
            ) : inbox.isError ? (
              <div className="text-center py-12 px-6">
                <p className="text-sm font-semibold">Couldn’t load notifications</p>
                <button onClick={() => inbox.refetch()} className="mt-2 text-sm font-semibold text-gold-ink hover:underline">Try again</button>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-14 px-6">
                <span className="mx-auto w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                  <BellOff size={20} className="text-muted-foreground" />
                </span>
                <p className="text-sm font-semibold">{tab === 'unread' ? 'You’re all caught up' : 'No notifications yet'}</p>
                <p className="text-[13px] text-muted-foreground mt-1">
                  {audience === 'admin'
                    ? 'New bookings, orders and stock alerts will show here.'
                    : 'Booking updates and wishlist restocks will show here.'}
                </p>
              </div>
            ) : (
              <>
                {group('Today', today)}
                {group('Earlier', earlier)}
              </>
            )}
          </div>

          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between shrink-0">
            <span>Kept for 30 days</span>
            {audience === 'customer' && (
              <Link to="/profile" onClick={() => setOpen(false)} className="font-semibold text-gold-ink hover:underline">Your account</Link>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
