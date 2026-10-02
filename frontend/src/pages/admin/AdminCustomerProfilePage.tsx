import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, CalendarCheck, ClipboardList, History, Link2, Mail, Pencil, Phone, Scissors, ShoppingBag, Star,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import api from '@/lib/axios'
import { formatDate, formatDateTime, formatKES } from '@/lib/utils'
import type { CustomerProfile, TimelineEvent } from '@/lib/types'
import AuditHistoryModal from '@/components/admin/AuditHistoryModal'
import EditCustomerModal from '@/components/admin/EditCustomerModal'
import InlineConfirm from '@/components/InlineConfirm'
import { useConfirm } from '@/hooks/useConfirm'
import { useToast } from '@/contexts/ToastContext'

type Tab = 'activity' | 'wishlist'

const EVENT_ICON: Record<TimelineEvent['type'], LucideIcon> = {
  sale: ShoppingBag, service: Scissors, order: ClipboardList, reservation: CalendarCheck, rating: Star,
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div aria-label={label} className="border rounded-xl p-4 bg-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold mt-0.5">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

const monthLabel = (month: string) => new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

/** Twelve bars, one per month. Plain markup (not a chart library) so each value is readable to everyone. */
function SpendChart({ months }: { months: CustomerProfile['spend_by_month'] }) {
  const max = Math.max(...months.map(m => Number(m.spend)), 1)
  return (
    <div role="img" aria-label="Spend over the last 12 months" className="border rounded-xl p-4 bg-card">
      <p className="text-sm font-semibold mb-3">Spend over the last 12 months</p>
      <ul className="flex items-end gap-1.5 h-32">
        {months.map(m => (
          <li key={m.month} className="flex-1 flex flex-col items-center justify-end h-full" title={`${monthLabel(m.month)}: ${formatKES(m.spend)}`}>
            <div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max((Number(m.spend) / max) * 100, Number(m.spend) > 0 ? 4 : 0)}%` }} />
            <span className="sr-only">{monthLabel(m.month)}</span>
            <span className="sr-only">{formatKES(m.spend)}</span>
            <span aria-hidden="true" className="text-[10px] text-muted-foreground mt-1">{monthLabel(m.month).slice(0, 3)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** One customer: who they are, how much they spend, what they have done, what they have saved. */
export default function AdminCustomerProfilePage() {
  const { kind, id } = useParams()
  const toast = useToast()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<Tab>('activity')
  const [editing, setEditing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const confirmLink = useConfirm<string>()

  const load = useCallback(() => {
    api.get<CustomerProfile>(`/admin/customers/${kind}/${id}/`)
      .then(r => { setProfile(r.data); setNotFound(false) })
      .catch(() => setNotFound(true))
  }, [kind, id])

  useEffect(load, [load])

  async function link() {
    confirmLink.cancel()
    if (!profile?.customer_id || !profile.possible_user) return
    try {
      await api.post(`/admin/customers/${profile.customer_id}/link/`, { user_id: profile.possible_user.id })
      toast.success(`Linked to @${profile.possible_user.username}.`)
      load()
    } catch {
      toast.error('Could not link this customer.')
    }
  }

  if (notFound) {
    return (
      <div className="space-y-3">
        <Link to="/admin/customers" className="text-sm text-primary inline-flex items-center gap-1"><ArrowLeft size={14} /> All customers</Link>
        <p className="py-10 text-center text-muted-foreground">Customer not found.</p>
      </div>
    )
  }
  if (!profile) return <div className="py-10 text-center text-muted-foreground">Loading…</div>

  const m = profile.metrics
  const registered = profile.kind === 'registered'

  return (
    <div className="space-y-6">
      <Link to="/admin/customers" className="text-sm text-primary inline-flex items-center gap-1"><ArrowLeft size={14} /> All customers</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{profile.name}</h2>
            {registered
              ? <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-medium">@{profile.username}</span>
              : <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-medium">Customer not in App</span>}
          </div>
          <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
            {profile.phone && <span className="inline-flex items-center gap-1"><Phone size={13} /> {profile.phone}</span>}
            {profile.email && <span className="inline-flex items-center gap-1"><Mail size={13} /> {profile.email}</span>}
            {profile.joined && <span>Joined {formatDate(profile.joined)}</span>}
          </p>
        </div>
        {profile.customer_id !== null && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowHistory(true)} className="btn-modern flex items-center gap-1.5"><History size={14} /> Change history</button>
            <button onClick={() => setEditing(true)} className="btn-modern flex items-center gap-1.5"><Pencil size={14} /> Edit contact</button>
          </div>
        )}
      </div>

      {profile.possible_user && profile.customer_id !== null && (
        <div role="status" className="border border-sky-300 bg-sky-50 text-sky-900 rounded-xl p-3 text-sm flex flex-wrap items-center gap-2">
          <Link2 size={14} /> Possible match: @{profile.possible_user.username} has this phone number on their account.
          {confirmLink.isAsking(profile.ref)
            ? <InlineConfirm label="Link" onConfirm={link} onCancel={confirmLink.cancel} />
            : <button onClick={() => confirmLink.ask(profile.ref)} aria-label={`Link to @${profile.possible_user.username}`} className="underline">Link them</button>}
        </div>
      )}

      <section aria-label="Customer metrics" className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Tile label="Total spend" value={formatKES(m.total_spend)} />
        <Tile label="Purchases" value={String(m.purchases)} />
        <Tile label="Average purchase" value={formatKES(m.average_purchase)} />
        <Tile label="Last purchase" value={m.last_purchase ? formatDate(m.last_purchase) : 'Never'} />
        <Tile label="Logins" value={m.logins === null ? 'Not an app user' : String(m.logins)} />
        <Tile label="Last seen" value={m.last_seen ? formatDateTime(m.last_seen) : 'Never'} />
      </section>

      <SpendChart months={profile.spend_by_month} />

      <div>
        <div role="tablist" className="flex gap-1 border-b mb-4">
          {(['activity', 'wishlist'] as Tab[]).map(t => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium -mb-px rounded-t-md capitalize ${tab === t ? 'bg-background border border-b-background' : 'text-muted-foreground hover:text-foreground'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'activity' && (
          <ul aria-label="Activity" className="space-y-2">
            {profile.timeline.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">No activity yet.</li>}
            {profile.timeline.map((e, i) => {
              const Icon = EVENT_ICON[e.type]
              return (
                <li key={`${e.type}-${e.date}-${i}`} className="border rounded-xl p-3 bg-card flex items-center gap-3">
                  <Icon size={16} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(e.date)}{e.detail && <> · <span>{e.detail}</span></>}</p>
                  </div>
                  {e.amount !== null && <p className="text-sm font-semibold">{formatKES(e.amount)}</p>}
                </li>
              )
            })}
          </ul>
        )}

        {tab === 'wishlist' && (profile.wishlist === null
          ? <p className="py-8 text-center text-sm text-muted-foreground">Walk-in customers have no account, so no wishlist.</p>
          : (
            <ul aria-label="Wishlist" className="space-y-2">
              {profile.wishlist.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">Nothing saved yet.</li>}
              {profile.wishlist.map(w => (
                <li key={`${w.type}-${w.id}`} className="border rounded-xl p-3 bg-card flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{w.name} <span className="text-xs text-muted-foreground capitalize">({w.type})</span></span>
                  <span className="text-sm">{formatKES(w.price)}</span>
                </li>
              ))}
            </ul>
          ))}
      </div>

      {editing && profile.customer_id !== null && (
        <EditCustomerModal customerId={profile.customer_id} name={profile.name} phone={profile.phone}
          onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load() }} />
      )}
      {showHistory && profile.customer_id !== null && (
        <AuditHistoryModal kind="customer" objectRef={profile.customer_id} title={profile.name} onClose={() => setShowHistory(false)} />
      )}
    </div>
  )
}
