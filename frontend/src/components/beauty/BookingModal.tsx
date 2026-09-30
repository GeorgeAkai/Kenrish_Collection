import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, CalendarDays } from 'lucide-react'
import api from '@/lib/axios'
import { useAuth } from '@/contexts/AuthContext'
import type { Service } from '@/lib/types'

interface FormSlot {
  time: string
  available: boolean
  remaining?: number
}

function formatSlotTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`
}

/**
 * Beauty storefront's booking flow: service -> date -> slot -> confirm.
 * Wired to the existing, unchanged reservation endpoints (same ones
 * ReservationPage.tsx uses) -- only the shell is new.
 */
export default function BookingModal({
  services,
  initialServiceId,
  initialDate,
  initialTime,
  onClose,
  onBooked,
}: {
  services: Service[]
  initialServiceId?: number
  /** YYYY-MM-DD — preset from "Today's openings". */
  initialDate?: string
  /** HH:MM — preset from "Today's openings". */
  initialTime?: string
  onClose: () => void
  onBooked?: () => void
}) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    service: initialServiceId ? String(initialServiceId) : '',
    reservation_date: initialDate ?? '',
    reservation_time: initialTime ?? '',
    notes: '',
  })
  const [slots, setSlots] = useState<FormSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); onClose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!form.reservation_date) { setSlots([]); return }
    setSlotsLoading(true)
    const params = new URLSearchParams({ date: form.reservation_date })
    if (form.service) params.set('service', form.service)
    api.get<FormSlot[]>(`/reservations/available-slots/?${params}`)
      .then(r => setSlots(r.data))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [form.service, form.reservation_date])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.reservation_time) { setError('Select a time slot.'); return }
    setSaving(true); setError('')
    try {
      await api.post('/reservations/', form)
      setSuccess(true)
      onBooked?.()
    } catch {
      setError('Could not submit your booking. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-pop w-full max-w-md max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <h3 className="text-base font-semibold" style={{ fontFamily: 'var(--font-display, inherit)' }}>
            {success ? 'Booking requested' : 'Book Appointment'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <CalendarDays size={32} className="mx-auto mb-3 text-primary" />
            <p className="text-sm text-foreground mb-1">Your appointment request has been sent.</p>
            <p className="text-xs text-muted-foreground mb-5">We'll confirm your slot shortly — track it under My Bookings.</p>
            <button onClick={onClose} className="btn-primary w-full">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-medium mb-1">Stylist / service</label>
              <select
                className="input-field"
                value={form.service}
                onChange={e => setForm(f => ({ ...f, service: e.target.value, reservation_time: '' }))}
              >
                <option value="">Any available</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                className="input-field"
                value={form.reservation_date}
                onChange={e => setForm(f => ({ ...f, reservation_date: e.target.value, reservation_time: '' }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Time slot</label>
              {!form.reservation_date ? (
                <p className="text-sm text-muted-foreground py-2">Choose a date first.</p>
              ) : slotsLoading ? (
                <p className="text-sm text-muted-foreground py-2">Loading times…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No slots that day.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {slots.map(slot => {
                    const isSelected = form.reservation_time === slot.time
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setForm(f => ({ ...f, reservation_time: slot.time }))}
                        className={`py-2 px-1 rounded-md text-xs font-medium transition-all border
                          ${isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                            : slot.available
                              ? 'bg-[var(--success-tint,theme(colors.green.50))] border-border text-[var(--success,theme(colors.green.700))] hover:opacity-80'
                              : 'bg-muted/40 border-border text-muted-foreground line-through cursor-not-allowed opacity-50'
                          }`}
                      >
                        {formatSlotTime(slot.time)}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes <span className="font-normal text-muted-foreground">(optional)</span></label>
              <textarea
                rows={2}
                className="input-field resize-none"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-60">
              {saving ? 'Booking…' : 'Confirm Booking'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
