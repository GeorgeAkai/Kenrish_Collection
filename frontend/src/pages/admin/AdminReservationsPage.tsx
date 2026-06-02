import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle, XCircle, Clock, CalendarDays, Plus, X, Trash2 } from 'lucide-react'
import InlineConfirm from '@/components/InlineConfirm'
import { useConfirm } from '@/hooks/useConfirm'
import api from '@/lib/axios'
import type { Reservation, ReservationStatus, Service } from '@/lib/types'

type TabStatus = '' | ReservationStatus

const STATUS_TABS: { value: TabStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_BADGE: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

interface AdminUser { id: number; username: string }

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [tab, setTab] = useState<TabStatus>('')
  const [loading, setLoading] = useState(true)
  const del = useConfirm<number>()

  // Action modal state
  const [actionTarget, setActionTarget] = useState<Reservation | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Add form modal
  const [showAdd, setShowAdd] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [addForm, setAddForm] = useState({
    customer: '',
    service: '',
    reservation_date: '',
    reservation_time: '',
    notes: '',
    status: 'APPROVED' as ReservationStatus,
    admin_notes: '',
  })
  const [addError, setAddError] = useState('')

  function fetchReservations(status: TabStatus = tab) {
    setLoading(true)
    const params = status ? `?status=${status}` : ''
    api.get<{ results: Reservation[]; pending_count: number }>(`/admin/reservations/${params}`)
      .then(r => {
        setReservations(r.data.results)
        setPendingCount(r.data.pending_count)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchReservations() }, [])

  useEffect(() => {
    api.get<{ results: Service[] }>('/admin/services/').then(r => setServices(r.data.results ?? r.data))
    api.get<AdminUser[]>('/admin/users/').then(r => {
      const data = Array.isArray(r.data) ? r.data : (r.data as { results?: AdminUser[] }).results ?? []
      setUsers(data)
    })
  }, [])

  function switchTab(t: TabStatus) {
    setTab(t)
    fetchReservations(t)
  }

  function openAction(r: Reservation, type: 'approve' | 'reject') {
    setActionTarget(r)
    setActionType(type)
    setAdminNotes(r.admin_notes)
  }

  async function submitAction() {
    if (!actionTarget || !actionType) return
    setSaving(true)
    await api.patch(`/admin/reservations/${actionTarget.id}/`, {
      status: actionType === 'approve' ? 'APPROVED' : 'REJECTED',
      admin_notes: adminNotes,
    })
    setSaving(false)
    setActionTarget(null)
    setActionType(null)
    fetchReservations()
  }

  async function handleDelete(id: number) {
    del.cancel()
    await api.delete(`/admin/reservations/${id}/`)
    fetchReservations()
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setAddError('')
    try {
      const payload: Record<string, unknown> = {
        reservation_date: addForm.reservation_date,
        reservation_time: addForm.reservation_time,
        notes: addForm.notes,
        status: addForm.status,
        admin_notes: addForm.admin_notes,
      }
      if (addForm.customer) payload.customer = Number(addForm.customer)
      if (addForm.service) payload.service = Number(addForm.service)
      await api.post('/admin/reservations/', payload)
      setShowAdd(false)
      fetchReservations()
    } catch {
      setAddError('Failed to save. Check all required fields.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">Reservations</h2>
          {pendingCount > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
              <Clock size={13} /> {pendingCount} pending approval
            </p>
          )}
        </div>
        <button
          onClick={() => { setAddForm({ customer: '', service: '', reservation_date: '', reservation_time: '', notes: '', status: 'APPROVED', admin_notes: '' }); setAddError(''); setShowAdd(true) }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={15} /> Add Reservation
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 flex-wrap">
        {STATUS_TABS.map(t => (
          <button
            key={t.value}
            onClick={() => switchTab(t.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t.label}
            {t.value === 'PENDING' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
      ) : reservations.length === 0 ? (
        <div className="py-16 text-center">
          <CalendarDays size={36} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No reservations{tab ? ` with status "${tab}"` : ''}</p>
        </div>
      ) : (
        <>
          {/* ── Mobile cards (< sm) ── */}
          <div className="sm:hidden space-y-3">
            {reservations.map(r => (
              <div key={r.id} className="border border-border rounded-xl p-4 space-y-2.5 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{r.customer_display ?? r.customer_username}</p>
                    <p className="text-xs text-muted-foreground">@{r.customer_username}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] ?? ''}`}>
                    {r.status_display}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CalendarDays size={11} />
                    {new Date(r.reservation_date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {r.reservation_time.slice(0, 5)}</span>
                  {r.service_name && <span>{r.service_name}</span>}
                </div>
                {r.notes && <p className="text-xs text-muted-foreground italic truncate">"{r.notes}"</p>}
                {r.admin_notes && <p className="text-xs text-muted-foreground truncate">Admin: {r.admin_notes}</p>}
                <div className="flex items-center gap-2 pt-0.5">
                  {r.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => openAction(r, 'approve')}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors font-medium"
                      >
                        <CheckCircle size={12} /> Approve
                      </button>
                      <button
                        onClick={() => openAction(r, 'reject')}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors font-medium"
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </>
                  )}
                  {del.isAsking(r.id) ? (
                    <InlineConfirm onConfirm={() => handleDelete(r.id)} onCancel={del.cancel} />
                  ) : (
                    <button
                      onClick={() => del.ask(r.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop table (sm+) ── */}
          <div className="hidden sm:block border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Service</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Date & Time</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Notes</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reservations.map(r => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.customer_display ?? r.customer_username}</p>
                      <p className="text-xs text-muted-foreground">@{r.customer_username}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.service_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <p>{new Date(r.reservation_date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <p className="text-xs text-muted-foreground">{r.reservation_time.slice(0, 5)}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="text-muted-foreground truncate">{r.notes || '—'}</p>
                      {r.admin_notes && <p className="text-xs text-muted-foreground italic truncate">Admin: {r.admin_notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] ?? ''}`}>
                        {r.status_display}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {r.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => openAction(r, 'approve')}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors"
                            >
                              <CheckCircle size={12} /> Approve
                            </button>
                            <button
                              onClick={() => openAction(r, 'reject')}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors"
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          </>
                        )}
                        {del.isAsking(r.id) ? (
                          <InlineConfirm onConfirm={() => handleDelete(r.id)} onCancel={del.cancel} />
                        ) : (
                          <button
                            onClick={() => del.ask(r.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Approve / Reject modal */}
      {actionTarget && actionType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-semibold capitalize">{actionType} Reservation</h3>
              <button onClick={() => setActionTarget(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"><X size={15} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Customer: <span className="text-foreground font-medium">{actionTarget.customer_username}</span><br />
                Date: <span className="text-foreground font-medium">
                  {new Date(actionTarget.reservation_date + 'T00:00:00').toLocaleDateString()} · {actionTarget.reservation_time.slice(0, 5)}
                </span>
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">Notes for customer <span className="font-normal text-muted-foreground">(optional)</span></label>
                <textarea
                  rows={3}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Reason or message to the customer…"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={submitAction}
                  disabled={saving}
                  className={`flex-1 text-white rounded-full py-2.5 text-sm font-semibold disabled:opacity-60 transition-all ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {saving ? 'Saving…' : `Confirm ${actionType === 'approve' ? 'Approval' : 'Rejection'}`}
                </button>
                <button onClick={() => setActionTarget(null)} className="flex-1 border border-border rounded-full py-2.5 text-sm hover:bg-muted transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add reservation modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background">
              <h3 className="font-semibold">Add Reservation</h3>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"><X size={15} /></button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Customer</label>
                <select
                  required
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={addForm.customer}
                  onChange={e => setAddForm(f => ({ ...f, customer: e.target.value }))}
                >
                  <option value="">— Select customer —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Service</label>
                <select
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={addForm.service}
                  onChange={e => setAddForm(f => ({ ...f, service: e.target.value }))}
                >
                  <option value="">— General Appointment —</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date" required
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={addForm.reservation_date}
                    onChange={e => setAddForm(f => ({ ...f, reservation_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <input
                    type="time" required
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={addForm.reservation_time}
                    onChange={e => setAddForm(f => ({ ...f, reservation_time: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={addForm.status}
                  onChange={e => setAddForm(f => ({ ...f, status: e.target.value as ReservationStatus }))}
                >
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Customer Notes <span className="font-normal text-muted-foreground">(optional)</span></label>
                <textarea rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Admin Notes <span className="font-normal text-muted-foreground">(internal)</span></label>
                <textarea rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  value={addForm.admin_notes} onChange={e => setAddForm(f => ({ ...f, admin_notes: e.target.value }))} />
              </div>

              {addError && <p className="text-sm text-red-500">{addError}</p>}

              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-primary text-primary-foreground rounded-full py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all">
                  {saving ? 'Saving…' : 'Save Reservation'}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 border border-border rounded-full py-2.5 text-sm hover:bg-muted transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
