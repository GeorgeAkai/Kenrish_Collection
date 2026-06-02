import { useEffect, useState } from 'react'
import { Settings2, Plus, Pencil, Trash2, X, CheckCircle, Clock } from 'lucide-react'
import api from '@/lib/axios'
import type { SlotConfiguration } from '@/lib/types'
import InlineConfirm from '@/components/InlineConfirm'
import { useConfirm } from '@/hooks/useConfirm'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DURATIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
  { label: '3 hours', value: 180 },
]

interface UnconfiguredService { id: number; name: string }

interface FormState {
  service: string
  worker_count: string
  slot_duration_minutes: string
  start_time: string
  end_time: string
  active_days: number[]
  is_active: boolean
}

const DEFAULT_FORM: FormState = {
  service: '',
  worker_count: '1',
  slot_duration_minutes: '30',
  start_time: '08:00',
  end_time: '20:00',
  active_days: [0, 1, 2, 3, 4, 5],
  is_active: true,
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export default function AdminSlotConfigPage() {
  const [configs, setConfigs] = useState<SlotConfiguration[]>([])
  const [unconfigured, setUnconfigured] = useState<UnconfiguredService[]>([])
  const [loading, setLoading] = useState(true)
  const del = useConfirm<number>()

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<SlotConfiguration | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchData = () => {
    setLoading(true)
    api.get('/admin/slot-configs/')
      .then(r => {
        setConfigs(r.data.configs)
        setUnconfigured(r.data.unconfigured_services)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  function openCreate() {
    setEditTarget(null)
    setForm(DEFAULT_FORM)
    setError('')
    setShowForm(true)
  }

  function openEdit(cfg: SlotConfiguration) {
    setEditTarget(cfg)
    setForm({
      service: String(cfg.service),
      worker_count: String(cfg.worker_count),
      slot_duration_minutes: String(cfg.slot_duration_minutes),
      start_time: cfg.start_time.slice(0, 5),
      end_time: cfg.end_time.slice(0, 5),
      active_days: cfg.active_days,
      is_active: cfg.is_active,
    })
    setError('')
    setShowForm(true)
  }

  function toggleDay(d: number) {
    setForm(f => ({
      ...f,
      active_days: f.active_days.includes(d)
        ? f.active_days.filter(x => x !== d)
        : [...f.active_days, d].sort(),
    }))
  }

  async function save() {
    setSaving(true)
    setError('')
    const payload = {
      service: Number(form.service),
      worker_count: Number(form.worker_count),
      slot_duration_minutes: Number(form.slot_duration_minutes),
      start_time: form.start_time,
      end_time: form.end_time,
      active_days: form.active_days,
      is_active: form.is_active,
    }
    try {
      if (editTarget) {
        await api.patch(`/admin/slot-configs/${editTarget.id}/`, payload)
      } else {
        await api.post('/admin/slot-configs/', payload)
      }
      setShowForm(false)
      fetchData()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string[]> } }).response?.data
      setError(data ? Object.values(data).flat().join(' ') : 'Failed to save configuration.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteConfig(id: number) {
    del.cancel()
    await api.delete(`/admin/slot-configs/${id}/`)
    fetchData()
  }

  async function toggleActive(cfg: SlotConfiguration) {
    await api.patch(`/admin/slot-configs/${cfg.id}/`, { is_active: !cfg.is_active })
    fetchData()
  }

  // Services available in the create form = unconfigured + currently edited
  const serviceOptions = editTarget
    ? [{ id: editTarget.service, name: editTarget.service_name }]
    : unconfigured

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings2 size={18} className="text-primary" /> Slot Configuration
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set booking slots, worker capacity, and hours per service.
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={unconfigured.length === 0}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={15} /> Add Configuration
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
      ) : configs.length === 0 ? (
        <div className="py-16 text-center">
          <Settings2 size={36} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground font-medium mb-1">No slot configurations yet</p>
          <p className="text-sm text-muted-foreground mb-4">Add one per service to enable per-capacity booking.</p>
          <button onClick={openCreate} className="text-sm text-primary hover:underline">
            + Configure your first service
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {configs.map(cfg => {
            const slotCount = (() => {
              const start = cfg.start_time.split(':').map(Number)
              const end = cfg.end_time.split(':').map(Number)
              const startMin = start[0] * 60 + start[1]
              const endMin = end[0] * 60 + end[1]
              return Math.floor((endMin - startMin) / cfg.slot_duration_minutes)
            })()
            const duration = DURATIONS.find(d => d.value === cfg.slot_duration_minutes)?.label ?? `${cfg.slot_duration_minutes} min`

            return (
              <div key={cfg.id} className={`border rounded-2xl p-5 bg-card transition-opacity ${cfg.is_active ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{cfg.service_name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {cfg.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                      <div>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground/60 block">Workers</span>
                        <span className="font-semibold text-foreground">{cfg.worker_count}</span>
                        <span className="text-xs ml-1">({cfg.worker_count} simultaneous)</span>
                      </div>
                      <div>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground/60 block">Duration</span>
                        <span className="font-semibold text-foreground">{duration}</span>
                      </div>
                      <div>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground/60 block">Hours</span>
                        <span className="font-semibold text-foreground">{formatTime(cfg.start_time)} – {formatTime(cfg.end_time)}</span>
                      </div>
                      <div>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground/60 block">Slots/day</span>
                        <span className="font-semibold text-foreground">{slotCount}</span>
                        <span className="text-xs ml-1">(×{cfg.worker_count} cap)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {DAYS.map((d, i) => (
                        <span
                          key={i}
                          className={`text-xs px-2 py-0.5 rounded-md font-medium ${cfg.active_days.includes(i) ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleActive(cfg)}
                      title={cfg.is_active ? 'Deactivate' : 'Activate'}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${cfg.is_active ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30' : 'text-muted-foreground hover:bg-muted'}`}
                    >
                      <CheckCircle size={15} />
                    </button>
                    <button
                      onClick={() => openEdit(cfg)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                    {del.isAsking(cfg.id) ? (
                      <InlineConfirm onConfirm={() => deleteConfig(cfg.id)} onCancel={del.cancel} />
                    ) : (
                      <button
                        onClick={() => del.ask(cfg.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {unconfigured.length > 0 && (
            <div className="border border-dashed border-border rounded-2xl p-5">
              <p className="text-sm font-medium text-muted-foreground mb-3">Services without configuration:</p>
              <div className="flex flex-wrap gap-2">
                {unconfigured.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { openCreate(); setForm(f => ({ ...f, service: String(s.id) })) }}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-dashed border-border rounded-lg hover:border-primary hover:text-primary transition-colors"
                  >
                    <Plus size={11} /> {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <h3 className="font-semibold">{editTarget ? `Edit — ${editTarget.service_name}` : 'New Slot Configuration'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1">

              {/* Service */}
              {!editTarget && (
                <div>
                  <label className="block text-sm font-medium mb-1">Service</label>
                  <select
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.service}
                    onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                  >
                    <option value="">— Select service —</option>
                    {serviceOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {/* Workers + Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Workers <span className="text-xs font-normal text-muted-foreground">(simultaneous slots)</span>
                  </label>
                  <input
                    type="number" min="1" max="20"
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.worker_count}
                    onChange={e => setForm(f => ({ ...f, worker_count: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slot Duration</label>
                  <select
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.slot_duration_minutes}
                    onChange={e => setForm(f => ({ ...f, slot_duration_minutes: e.target.value }))}
                  >
                    {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Opens at</label>
                  <input
                    type="time"
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.start_time}
                    onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Closes at</label>
                  <input
                    type="time"
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.end_time}
                    onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                  />
                </div>
              </div>

              {/* Active days */}
              <div>
                <label className="block text-sm font-medium mb-2">Active Days</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                        form.active_days.includes(i)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {form.start_time && form.end_time && form.slot_duration_minutes && (
                <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5 font-medium text-foreground mb-1">
                    <Clock size={12} /> Slot preview
                  </p>
                  <p>
                    {(() => {
                      const dur = Number(form.slot_duration_minutes)
                      const [sh, sm] = form.start_time.split(':').map(Number)
                      const [eh, em] = form.end_time.split(':').map(Number)
                      const count = Math.floor(((eh * 60 + em) - (sh * 60 + sm)) / dur)
                      const cap = Number(form.worker_count)
                      return count > 0
                        ? `${count} slots/day × ${cap} worker${cap !== 1 ? 's' : ''} = ${count * cap} total bookings per day`
                        : 'Invalid time range'
                    })()}
                  </p>
                </div>
              )}

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm font-medium">Configuration active</span>
              </label>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={save}
                  disabled={saving || (!editTarget && !form.service)}
                  className="flex-1 bg-primary text-primary-foreground rounded-full py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
                >
                  {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Configuration'}
                </button>
                <button onClick={() => setShowForm(false)} className="flex-1 border border-border rounded-full py-2.5 text-sm hover:bg-muted transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
