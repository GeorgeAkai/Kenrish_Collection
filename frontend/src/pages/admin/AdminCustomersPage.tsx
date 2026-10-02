import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Link2, Phone, Trophy } from 'lucide-react'
import api from '@/lib/axios'
import { formatDate, formatKES } from '@/lib/utils'
import type { CustomerRow } from '@/lib/types'
import InlineConfirm from '@/components/InlineConfirm'
import { useConfirm } from '@/hooks/useConfirm'
import { useToast } from '@/contexts/ToastContext'

type Tab = 'all' | 'registered' | 'walkin'
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'registered', label: 'Registered' },
  { key: 'walkin', label: 'Not in app' },
]
const PERIODS = [
  { value: 'all', label: 'All time' },
  { value: 'year', label: 'Last year' },
  { value: '90d', label: 'Last 90 days' },
  { value: '30d', label: 'Last 30 days' },
]
const TOP_COUNT = 10
const filterCls = 'border rounded-md px-2.5 py-1.5 text-sm bg-background'

/** Does this customer match what was typed? Names ignore case; phone numbers ignore spaces and a leading 0 / +254. */
function matches(c: CustomerRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (c.name.toLowerCase().includes(q) || (c.username ?? '').toLowerCase().includes(q)) return true
  const digits = q.replace(/\D/g, '')
  if (!digits) return false
  const local = digits.replace(/^(254|0)/, '')
  return local.length > 0 && c.phone.replace(/\D/g, '').includes(local)
}

const profilePath = (c: CustomerRow) => `/admin/customers/${c.ref.replace(':', '/')}`

/** Mini CRM: customers ranked by what they spend, registered users and walk-ins together. */
export default function AdminCustomersPage() {
  const toast = useToast()
  const [rows, setRows] = useState<CustomerRow[] | null>(null)
  const [shop, setShop] = useState('')
  const [period, setPeriod] = useState('all')
  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const confirmLink = useConfirm<string>()

  function load() {
    const params: Record<string, string> = { period }
    if (shop) params.shop = shop
    api.get<CustomerRow[]>('/admin/customers/', { params }).then(r => setRows(r.data)).catch(console.error)
  }
  useEffect(load, [shop, period])  // eslint-disable-line react-hooks/exhaustive-deps

  async function link(c: CustomerRow) {
    confirmLink.cancel()
    try {
      await api.post(`/admin/customers/${c.ref.split(':')[1]}/link/`, { user_id: c.possible_user!.id })
      toast.success(`${c.name} is now linked to @${c.possible_user!.username}.`)
      load()
    } catch {
      toast.error('Could not link this customer.')
    }
  }

  const top = useMemo(() => (rows ?? []).filter(c => Number(c.spend) > 0).slice(0, TOP_COUNT), [rows])
  const visible = useMemo(
    () => (rows ?? []).filter(c => (tab === 'all' || c.kind === tab) && matches(c, query)),
    [rows, tab, query],
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Customers</h2>
        <p className="text-sm text-muted-foreground">Everyone who has bought a product or service, ranked by how much they spend.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground mb-0.5">Shop</span>
          <select className={filterCls} value={shop} onChange={e => setShop(e.target.value)}>
            <option value="">Both shops</option>
            <option value="beauty">Beauty</option>
            <option value="fashion">Fashion</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground mb-0.5">Period</span>
          <select className={filterCls} value={period} onChange={e => setPeriod(e.target.value)}>
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
      </div>

      <section aria-label="Top customers" className="border rounded-xl p-4 bg-card">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3"><Trophy size={15} className="text-gold" /> Top customers</h3>
        {rows && top.length === 0 && <p className="text-sm text-muted-foreground">No purchases in this period yet.</p>}
        <ol className="space-y-2">
          {top.map((c, i) => (
            <li key={c.ref} className="flex items-center gap-3 text-sm">
              <span className="w-7 text-xs font-semibold text-muted-foreground">#{i + 1}</span>
              <Link to={profilePath(c)} className="flex-1 font-medium hover:underline truncate">{c.name}</Link>
              <span className="text-xs text-muted-foreground">{c.purchases} purchase{c.purchases === 1 ? '' : 's'}</span>
              <span className="font-semibold">{formatKES(c.spend)}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="flex gap-1 border-b">
          {TABS.map(t => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium -mb-px rounded-t-md ${tab === t.key ? 'bg-background border border-b-background' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <input type="search" aria-label="Search customers" placeholder="Search name or phone…" className={`${filterCls} w-full sm:w-64`}
          value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <ul aria-label="Customers" className="space-y-2">
        {rows && rows.length === 0 && (
          <li className="py-10 text-center text-sm text-muted-foreground">No customers yet. They appear when you record a sale with a phone number.</li>
        )}
        {rows && rows.length > 0 && visible.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">Nobody matches.</li>}
        {visible.map(c => (
          <li key={c.ref} className="border rounded-xl p-3 bg-card flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex-1 min-w-[14rem]">
              <p className="font-medium text-sm flex flex-wrap items-center gap-2">
                <Link to={profilePath(c)} className="hover:underline">{c.name}</Link>
                {c.kind === 'walkin'
                  ? <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-medium">Customer not in App</span>
                  : <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-medium">@{c.username}</span>}
              </p>
              <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 mt-0.5">
                {c.phone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {c.phone}</span>}
                <span>{c.purchases > 0 ? `Last purchase ${formatDate(c.last_purchase!)}` : 'No purchases yet'}</span>
              </p>
              {c.possible_user && (
                <p className="text-xs mt-1.5 flex flex-wrap items-center gap-2 text-primary">
                  <Link2 size={12} /> Possible match: @{c.possible_user.username}
                  {confirmLink.isAsking(c.ref)
                    ? <InlineConfirm label="Link" onConfirm={() => link(c)} onCancel={confirmLink.cancel} />
                    : <button onClick={() => confirmLink.ask(c.ref)} aria-label={`Link ${c.name} to @${c.possible_user.username}`}
                        className="underline">Link them</button>}
                </p>
              )}
            </div>
            <div className="text-right min-w-[8rem]">
              <p className="font-semibold text-sm">{formatKES(c.spend)}</p>
              <p className="text-xs text-muted-foreground">{c.purchases} purchase{c.purchases === 1 ? '' : 's'}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
