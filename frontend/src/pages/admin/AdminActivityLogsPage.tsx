import { useEffect, useState, useCallback } from 'react'
import { Eye, Users, ShoppingBag, LogIn, ShieldAlert, MousePointerClick, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import api from '@/lib/axios'
import { formatChartDate, formatPeriodRange, NAIROBI_TZ } from '@/lib/utils'
import KpiCard from '@/components/admin/KpiCard'
import InlineConfirm from '@/components/InlineConfirm'
import { useToast } from '@/contexts/ToastContext'
import type { PaginatedResponse } from '@/lib/types'

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year'
type Tab = 'overview' | 'log'

interface Stats {
  totals: {
    events: number; page_views: number; product_views: number; unique_visitors: number
    signed_in_users: number; logins: number; failed_logins: number; actions: number
  }
  daily: { date: string; page_views: number; visitors: number }[]
  top_pages: { path: string; views: number }[]
  top_products: { type: string; id: number; name: string; views: number }[]
  top_searches: { term: string; count: number }[]
  top_users: { username: string; events: number; last_seen: string }[]
  recent_failed_logins: { username: string; ip: string | null; at: string }[]
}

interface LogRow {
  id: number
  username: string
  event: string
  event_display: string
  path: string
  method: string
  status_code: number | null
  object_type: string
  object_name: string
  detail: string
  ip_address: string | null
  user_agent: string
  created_at: string
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' }, { key: 'week', label: 'Week' }, { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' }, { key: 'year', label: 'Year' },
]
const EVENTS = [
  { value: '', label: 'All events' }, { value: 'page_view', label: 'Page views' },
  { value: 'product_view', label: 'Product views' }, { value: 'login', label: 'Logins' },
  { value: 'login_failed', label: 'Failed logins' }, { value: 'register', label: 'Sign-ups' },
  { value: 'action', label: 'Actions' },
]

const panel = 'bg-card border border-border rounded-[20px] p-4 lg:p-6 shadow-card min-w-0'
const heading = 'font-heading text-lg lg:text-xl font-semibold mb-4'
const th = 'text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground'

const fmtWhen = (iso: string) => new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'medium', timeZone: NAIROBI_TZ })

/** Every event carries a word, never colour alone. */
function EventBadge({ event, label }: { event: string; label: string }) {
  const tone = event === 'login_failed' ? 'bg-danger-tint text-danger'
    : event === 'action' ? 'bg-warning-tint text-warning'
    : event === 'login' || event === 'register' ? 'bg-success-tint text-success'
    : 'bg-secondary text-muted-foreground'
  return <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-xs font-bold whitespace-nowrap ${tone}`}>{label}</span>
}

function describe(r: LogRow) {
  if (r.event === 'product_view') return `Viewed ${r.object_type}: ${r.object_name}`
  if (r.event === 'page_view') return r.detail ? `${r.path} (${r.detail})` : r.path
  if (r.event === 'action') return r.detail
  if (r.event === 'login_failed') return `Failed login (${r.detail.replace('tried: ', '')})`
  if (r.event === 'login') return 'Signed in'
  return 'Created an account'
}

export default function AdminActivityLogsPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [period, setPeriod] = useState<Period>('week')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const [rows, setRows] = useState<LogRow[]>([])
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [logLoading, setLogLoading] = useState(false)
  const [event, setEvent] = useState('')
  const [user, setUser] = useState('')
  const [q, setQ] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [purgeDays, setPurgeDays] = useState('90')
  const [confirmPurge, setConfirmPurge] = useState(false)
  const toast = useToast()

  useEffect(() => {
    setLoading(true)
    api.get<Stats>(`/admin/activity/stats/?period=${period}`)
      .then(r => setStats(r.data)).catch(() => toast.error("Couldn't load activity analytics."))
      .finally(() => setLoading(false))
  }, [period])

  const loadLog = useCallback(() => {
    setLogLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (event) params.set('event', event)
    if (user) params.set('user', user)
    if (q) params.set('q', q)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    api.get<PaginatedResponse<LogRow>>(`/admin/activity/?${params}`).then(r => {
      setRows(r.data.results); setCount(r.data.count); setHasNext(!!r.data.next)
    }).catch(() => toast.error("Couldn't load the activity log.")).finally(() => setLogLoading(false))
  }, [page, event, user, q, dateFrom, dateTo])

  useEffect(() => { if (tab === 'log') loadLog() }, [tab, loadLog])

  function filterBy(setter: (v: string) => void, value: string) { setter(value); setPage(1) }

  function viewUser(username: string) {
    setUser(username); setEvent(''); setQ(''); setPage(1); setTab('log')
  }

  async function purge() {
    setConfirmPurge(false)
    try {
      const { data } = await api.delete<{ deleted: number }>(`/admin/activity/purge/?days=${purgeDays}`)
      toast.success(`Deleted ${data.deleted} log entr${data.deleted === 1 ? 'y' : 'ies'} older than ${purgeDays} days.`)
      loadLog()
    } catch {
      toast.error('Could not purge logs. Enter a number of days (1 or more).')
    }
  }

  const t = stats?.totals

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-5 lg:mb-7 gap-4">
        <div>
          <p className="eyebrow mb-1.5">Users</p>
          <h2 className="font-heading text-[26px] lg:text-4xl font-semibold leading-tight">Activity logs</h2>
          {tab === 'overview' && <p className="text-sm text-muted-foreground mt-1.5 tabular-nums">{formatPeriodRange(period)}</p>}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div role="tablist" aria-label="View" className="grid grid-cols-2 p-1 rounded-full bg-secondary border border-border">
            {([['overview', 'Overview'], ['log', 'Log']] as const).map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`h-9 px-5 rounded-full text-sm font-semibold transition-colors ${tab === k ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
          {tab === 'overview' && (
            <div role="radiogroup" aria-label="Period" className="grid grid-cols-5 p-1 rounded-full bg-secondary border border-border">
              {PERIODS.map(p => (
                <button key={p.key} role="radio" aria-checked={period === p.key} onClick={() => setPeriod(p.key)}
                  className={`h-9 px-2 sm:px-3.5 rounded-full text-[13px] sm:text-sm font-semibold whitespace-nowrap transition-colors ${period === p.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {tab === 'overview' ? (
        loading || !stats || !t ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">Loading activity…</div>
        ) : (
          <div className="space-y-5 lg:space-y-7">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-4">
              <KpiCard accent icon={Eye} label="Page views" value={t.page_views.toLocaleString()} />
              <KpiCard icon={Users} label="Unique visitors" value={t.unique_visitors.toLocaleString()} hint={`${t.signed_in_users} signed in`} />
              <KpiCard icon={ShoppingBag} label="Products seen" value={t.product_views.toLocaleString()} />
              <KpiCard icon={LogIn} label="Logins" value={t.logins.toLocaleString()} />
              <KpiCard icon={ShieldAlert} label="Failed logins" value={t.failed_logins.toLocaleString()} tone={t.failed_logins > 0 ? 'down' : undefined} />
              <KpiCard icon={MousePointerClick} label="Actions" value={t.actions.toLocaleString()} hint="Orders, edits, deletes…" />
            </div>

            <div className={panel}>
              <h3 className={heading}>Visits over time</h3>
              {stats.daily.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">No page views in this period yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={stats.daily}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={formatChartDate} minTickGap={28} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip labelFormatter={l => formatChartDate(String(l))} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="page_views" name="Page views" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="visitors" name="Unique visitors" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
              <RankList title="Pages visited" empty="No page views yet."
                rows={stats.top_pages.map(p => ({ key: p.path, label: p.path, sub: undefined, value: p.views, unit: 'views' }))} />
              <RankList title="Products seen" empty="No product views yet."
                rows={stats.top_products.map(p => ({ key: `${p.type}-${p.id}`, label: p.name, sub: p.type, value: p.views, unit: 'views' }))} />
              <RankList title="Top searches" empty="No searches yet."
                rows={stats.top_searches.map(s => ({ key: s.term, label: s.term, sub: undefined, value: s.count, unit: 'searches' }))} />
              <RankList title="Most active users" empty="No signed-in activity yet."
                onPick={viewUser}
                rows={stats.top_users.map(u => ({ key: u.username, label: u.username, sub: `Last seen ${fmtWhen(u.last_seen)}`, value: u.events, unit: 'events' }))} />
            </div>

            <div className={panel}>
              <h3 className={heading.replace('mb-4', 'mb-1')}>Recent failed logins</h3>
              <p className="text-xs text-muted-foreground mb-4">Repeated failures from one address can mean someone is guessing passwords.</p>
              {stats.recent_failed_logins.length === 0 ? (
                <p className="text-sm text-success">No failed logins in this period.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary"><tr><th className={th}>When</th><th className={th}>Username tried</th><th className={th}>IP address</th></tr></thead>
                    <tbody>
                      {stats.recent_failed_logins.map((f, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-4 py-2.5 whitespace-nowrap">{fmtWhen(f.at)}</td>
                          <td className="px-4 py-2.5 font-semibold">{f.username || '-'}</td>
                          <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{f.ip ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <Field label="Event">
              <select className="input-field" value={event} onChange={e => filterBy(setEvent, e.target.value)}>
                {EVENTS.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
              </select>
            </Field>
            <Field label="User">
              <input className="input-field" placeholder="username" value={user} onChange={e => filterBy(setUser, e.target.value)} />
            </Field>
            <Field label="Search">
              <input className="input-field" placeholder="page, product, action…" value={q} onChange={e => filterBy(setQ, e.target.value)} />
            </Field>
            <Field label="From"><input type="date" className="input-field" value={dateFrom} onChange={e => filterBy(setDateFrom, e.target.value)} /></Field>
            <Field label="To"><input type="date" className="input-field" value={dateTo} onChange={e => filterBy(setDateTo, e.target.value)} /></Field>
            <div className="text-sm text-muted-foreground pb-2.5 lg:text-right">{count.toLocaleString()} entr{count === 1 ? 'y' : 'ies'}</div>
          </div>

          <div className="hidden md:block border rounded-2xl overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr><th className={th}>When</th><th className={th}>User</th><th className={th}>Event</th><th className={th}>What</th><th className={th}>IP</th></tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-gold-tint/60 align-top">
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{fmtWhen(r.created_at)}</td>
                    <td className="px-4 py-2.5 font-semibold">{r.username || <span className="font-normal text-muted-foreground">Visitor</span>}</td>
                    <td className="px-4 py-2.5"><EventBadge event={r.event} label={r.event_display} /></td>
                    <td className="px-4 py-2.5 break-all">
                      {describe(r)}
                      {r.event === 'action' && <span className="block text-xs text-muted-foreground">{r.method} {r.path} · {r.status_code}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground tabular-nums whitespace-nowrap" title={r.user_agent}>{r.ip_address ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="md:hidden space-y-2">
            {rows.map(r => (
              <li key={r.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <EventBadge event={r.event} label={r.event_display} />
                  <span className="text-xs text-muted-foreground">{fmtWhen(r.created_at)}</span>
                </div>
                <p className="text-sm font-semibold">{r.username || 'Visitor'}</p>
                <p className="text-sm break-all">{describe(r)}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{r.ip_address ?? ''}</p>
              </li>
            ))}
          </ul>
          {!logLoading && rows.length === 0 && <div className="text-center py-12 text-muted-foreground border rounded-2xl">No activity matches these filters.</div>}
          {logLoading && <p className="text-center text-sm text-muted-foreground">Loading…</p>}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-modern btn-modern--secondary text-sm">Previous</button>
              <span className="text-sm text-muted-foreground">Page {page}</span>
              <button disabled={!hasNext} onClick={() => setPage(p => p + 1)} className="btn-modern btn-modern--primary text-sm">Next</button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Trash2 size={14} className="text-muted-foreground" />
              <span className="text-muted-foreground">Delete entries older than</span>
              <input type="number" min={1} value={purgeDays} onChange={e => setPurgeDays(e.target.value)} aria-label="Days" className="input-field !w-20 !py-1.5" />
              <span className="text-muted-foreground">days</span>
              {confirmPurge
                ? <InlineConfirm onConfirm={purge} onCancel={() => setConfirmPurge(false)} label="Delete" />
                : <button onClick={() => setConfirmPurge(true)} className="btn-modern btn-modern--secondary text-sm">Purge…</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  )
}

function RankList({ title, rows, empty, onPick }: {
  title: string
  empty: string
  onPick?: (label: string) => void
  rows: { key: string; label: string; sub?: string; value: number; unit: string }[]
}) {
  return (
    <div className={panel}>
      <h3 className={heading}>{title}</h3>
      {rows.length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">{empty}</p> : (
        <ul className="divide-y divide-border">
          {rows.map((r, i) => (
            <li key={r.key} className="flex items-center gap-3 py-2.5">
              <span className="w-5 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                {onPick
                  ? <button onClick={() => onPick(r.label)} className="text-sm font-semibold truncate text-left hover:underline underline-offset-2 max-w-full">{r.label}</button>
                  : <p className="text-sm font-semibold truncate">{r.label}</p>}
                {r.sub && <p className="text-xs text-muted-foreground capitalize truncate">{r.sub}</p>}
              </div>
              <span className="text-sm font-bold tabular-nums">{r.value.toLocaleString()}<span className="text-xs font-normal text-muted-foreground"> {r.unit}</span></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
