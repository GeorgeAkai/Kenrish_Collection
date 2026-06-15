import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import InlineConfirm from '@/components/InlineConfirm'
import { useConfirm } from '@/hooks/useConfirm'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, CalendarDays, Clock, X,
  CheckCircle, AlertCircle, XCircle, MinusCircle,
  CheckCircle2, Ban, Minus, CalendarOff, Sparkles,
} from 'lucide-react'
import api from '@/lib/axios'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Reservation, Service } from '@/lib/types'

// ─── helpers ─────────────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
function toDateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function formatSlotTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`
}

// ─── DaySchedule ─────────────────────────────────────────────────────────────

interface PublicSlot {
  time: string
  available: boolean
  booked: boolean
  past: boolean
  available_spots?: number
  total_capacity?: number
}

interface FormSlot {
  time: string
  available: boolean
  capacity?: number
  booked?: number
  remaining?: number
}

function DaySchedule({
  date,
  slots,
  loading,
  onSlotClick,
  isAuthenticated,
}: {
  date: string
  slots: PublicSlot[]
  loading: boolean
  onSlotClick: (time: string) => void
  isAuthenticated: boolean
}) {
  const { t } = useLanguage()
  const dateObj = new Date(date + 'T00:00:00')
  const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'long' })
  const dateFmt = dateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })

  const availableCount = slots.filter(s => s.available).length
  const bookedCount = slots.filter(s => s.booked).length

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm">{dayName}</h3>
          <span className="text-xs text-muted-foreground">{dateFmt}</span>
        </div>
        {slots.length > 0 && (
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              {availableCount} {t('res.open')}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-primary">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              {bookedCount} {t('res.legendBooked').toLowerCase()}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 max-h-[320px] sm:max-h-[480px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Sparkles size={22} className="mb-2 animate-pulse text-primary/40" />
            <p className="text-xs">{t('res.loadingSchedule')}</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <CalendarOff size={28} className="mb-2 opacity-30" />
            <p className="text-xs">{t('res.closedSunday')}</p>
          </div>
        ) : (
          slots.map(slot => {
            const label = formatSlotTime(slot.time)

            if (slot.past && !slot.booked) {
              return (
                <div
                  key={slot.time}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl opacity-35 select-none"
                >
                  <span className="w-[72px] shrink-0 text-[11px] font-mono text-muted-foreground">{label}</span>
                  <span className="flex-1 h-1 rounded-full bg-border" />
                  <Minus size={11} className="text-muted-foreground shrink-0" />
                </div>
              )
            }

            if (slot.booked) {
              return (
                <div
                  key={slot.time}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-primary/8 border border-primary/15 cursor-default"
                >
                  <span className="w-[72px] shrink-0 text-[11px] font-mono font-medium text-primary">{label}</span>
                  <span className="flex-1 h-2 rounded-full bg-primary/30 relative overflow-hidden">
                    <span className="absolute inset-0 bg-primary/50 animate-pulse rounded-full" />
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Ban size={11} className="text-primary/70" />
                    <span className="text-[11px] text-primary/70 font-medium">{t('res.slotFull')}</span>
                  </div>
                </div>
              )
            }

            const spots = slot.available_spots
            return (
              <button
                key={slot.time}
                onClick={() => onSlotClick(slot.time)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-transparent
                  hover:border-green-300 dark:hover:border-green-700
                  hover:bg-green-50 dark:hover:bg-green-950/30
                  group transition-all duration-150 cursor-pointer"
              >
                <span className="w-[72px] shrink-0 text-[11px] font-mono text-muted-foreground group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
                  {label}
                </span>
                <span className="flex-1 h-2 rounded-full bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors" />
                <div className="flex items-center gap-1 shrink-0">
                  {spots !== undefined && spots > 0 && (
                    <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">{spots} {t('res.slotOpen')}</span>
                  )}
                  <CheckCircle2 size={11} className="text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-[11px] text-green-600 dark:text-green-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    {isAuthenticated ? t('res.bookSlot') : t('res.signInShort')}
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Footer CTA */}
      {!loading && slots.length > 0 && availableCount > 0 && (
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground text-center">
            {isAuthenticated ? t('res.clickToBook') : t('res.signInSlot')}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export default function ReservationPage() {
  const { isAuthenticated } = useAuth()
  const { t, days: DAYS, months: MONTHS } = useLanguage()
  const navigate = useNavigate()

  const today = new Date()
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate())

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [myReservations, setMyReservations] = useState<Reservation[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  const [daySlots, setDaySlots] = useState<PublicSlot[]>([])
  const [daySlotsLoading, setDaySlotsLoading] = useState(false)

  const scheduleRef = useRef<HTMLDivElement>(null)
  const confirmCancel = useConfirm<number>()

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    service: '',
    reservation_date: '',
    reservation_time: '',
    notes: '',
  })

  const [formSlots, setFormSlots] = useState<FormSlot[]>([])
  const [formSlotsLoading, setFormSlotsLoading] = useState(false)

  const STATUS_META: Record<string, { label: string; color: string; icon: ReactNode }> = {
    PENDING:   { label: t('res.statusPending'),   color: 'bg-amber-400',  icon: <AlertCircle size={13} /> },
    APPROVED:  { label: t('res.statusApproved'),  color: 'bg-green-500',  icon: <CheckCircle size={13} /> },
    REJECTED:  { label: t('res.statusRejected'),  color: 'bg-red-500',    icon: <XCircle size={13} /> },
    CANCELLED: { label: t('res.statusCancelled'), color: 'bg-gray-400',   icon: <MinusCircle size={13} /> },
  }

  const eventMap = new Map<string, Reservation[]>()
  reservations.forEach(r => {
    if (!eventMap.has(r.reservation_date)) eventMap.set(r.reservation_date, [])
    eventMap.get(r.reservation_date)!.push(r)
  })

  useEffect(() => {
    setLoading(true)
    const fetches: Promise<unknown>[] = [
      api.get<Service[]>('/services/').then(r => setServices(r.data)),
    ]
    if (isAuthenticated) {
      fetches.push(
        api.get<Reservation[]>('/reservations/').then(r => setReservations(r.data)),
        api.get<Reservation[]>('/reservations/my/').then(r => setMyReservations(r.data)),
      )
    }
    Promise.all(fetches).finally(() => setLoading(false))
  }, [isAuthenticated])

  useEffect(() => {
    if (!selectedDate) { setDaySlots([]); return }
    setDaySlotsLoading(true)
    api.get<PublicSlot[]>(`/reservations/public-slots/?date=${selectedDate}`)
      .then(r => setDaySlots(r.data))
      .catch(() => setDaySlots([]))
      .finally(() => setDaySlotsLoading(false))
  }, [selectedDate])

  useEffect(() => {
    if (!showForm || !form.reservation_date) { setFormSlots([]); return }
    setFormSlotsLoading(true)
    const params = new URLSearchParams({ date: form.reservation_date })
    if (form.service) params.set('service', form.service)
    api.get<{ time: string; available: boolean }[]>(`/reservations/available-slots/?${params}`)
      .then(r => setFormSlots(r.data))
      .catch(() => setFormSlots([]))
      .finally(() => setFormSlotsLoading(false))
  }, [showForm, form.service, form.reservation_date])

  useEffect(() => {
    if (!selectedDate || !scheduleRef.current) return
    if (window.matchMedia('(min-width: 1024px)').matches) return
    setTimeout(() => scheduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
  }, [selectedDate])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    setSelectedDate(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    setSelectedDate(null)
  }

  function openRequest(date?: string, time?: string) {
    if (!isAuthenticated) { navigate('/login'); return }
    setForm({ service: '', reservation_date: date ?? '', reservation_time: time ?? '', notes: '' })
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.reservation_time) { setError(t('res.selectTimeError')); return }
    setSaving(true); setError('')
    try {
      await api.post('/reservations/', form)
      setSuccess(t('res.successMsg'))
      setShowForm(false)
      const [calRes, myRes] = await Promise.all([
        api.get<Reservation[]>('/reservations/'),
        api.get<Reservation[]>('/reservations/my/'),
      ])
      setReservations(calRes.data)
      setMyReservations(myRes.data)
      if (selectedDate) {
        api.get<PublicSlot[]>(`/reservations/public-slots/?date=${selectedDate}`)
          .then(r => setDaySlots(r.data)).catch(() => {})
      }
    } catch {
      setError(t('res.failMsg'))
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel(id: number) {
    confirmCancel.cancel()
    await api.post(`/reservations/${id}/cancel/`)
    const [calRes, myRes] = await Promise.all([
      api.get<Reservation[]>('/reservations/'),
      api.get<Reservation[]>('/reservations/my/'),
    ])
    setReservations(calRes.data)
    setMyReservations(myRes.data)
    if (selectedDate) {
      api.get<PublicSlot[]>(`/reservations/public-slots/?date=${selectedDate}`)
        .then(r => setDaySlots(r.data)).catch(() => {})
    }
  }

  const totalDays = daysInMonth(year, month)
  const firstDay = firstDayOfMonth(year, month)
  const cells = Array.from({ length: firstDay + totalDays }, (_, i) => i < firstDay ? null : i - firstDay + 1)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6 sm:mb-8">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t('res.title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('res.subtitle')}
          </p>
        </div>
        <button
          onClick={() => openRequest(selectedDate ?? '')}
          className="flex items-center justify-center gap-2 w-full sm:w-auto bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-semibold text-sm hover:opacity-90 transition-all shadow-md"
        >
          <CalendarDays size={16} /> {t('res.bookBtn')}
        </button>
      </div>

      {/* ── Success banner ─────────────────────────────────────────────── */}
      {success && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm">
          <CheckCircle size={16} className="shrink-0" /> {success}
        </div>
      )}

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> {t('res.legendAvailable')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" /> {t('res.legendBooked')}
        </span>
        {Object.entries(STATUS_META).map(([k, v]) => (
          <span key={k} className="hidden sm:flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${v.color}`} /> {v.label}
          </span>
        ))}
      </div>

      {/* ── Main grid ──────────────────────────────────────────────────── */}
      <div className={`grid gap-5 ${selectedDate ? 'grid-cols-1 lg:grid-cols-[1fr_320px]' : 'grid-cols-1'}`}>

        {/* Left — calendar + my reservations */}
        <div className="space-y-5">

          {/* Month calendar */}
          <div className="bg-card border border-border rounded-2xl p-3 sm:p-5 shadow-sm">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={prevMonth}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <h2 className="font-semibold text-base">{MONTHS[month]} {year}</h2>
              <button
                onClick={nextMonth}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            {loading ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">{t('res.loadingCal')}</div>
            ) : (
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((day, idx) => {
                  if (!day) return <div key={idx} />
                  const key = toDateKey(year, month, day)
                  const events = eventMap.get(key) ?? []
                  const isToday = key === todayKey
                  const isSelected = key === selectedDate
                  const isPast = key < todayKey
                  const isSunday = new Date(key + 'T00:00:00').getDay() === 0

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(isSelected ? null : key)}
                      disabled={isPast && events.length === 0}
                      className={`relative flex flex-col items-center rounded-xl p-0.5 sm:p-1 min-h-[44px] sm:min-h-[52px] transition-all text-sm
                        ${isSelected
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                          : isToday
                            ? 'bg-primary/10 text-primary font-semibold ring-1 ring-primary/30'
                            : isSunday
                              ? 'opacity-30 cursor-not-allowed'
                              : isPast
                                ? 'opacity-40'
                                : 'hover:bg-muted cursor-pointer'
                        }`}
                    >
                      <span className="text-xs font-medium">{day}</span>
                      {events.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                          {events.slice(0, 3).map(ev => (
                            <span
                              key={ev.id}
                              className={`w-1.5 h-1.5 rounded-full ${STATUS_META[ev.status]?.color ?? 'bg-primary'} ${isSelected ? 'opacity-80' : ''}`}
                            />
                          ))}
                          {events.length > 3 && (
                            <span className="text-[9px] text-muted-foreground">+{events.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* My reservations */}
          {isAuthenticated && myReservations.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Clock size={14} className="text-primary" /> {t('res.myReservations')}
              </h3>
              <ul className="space-y-2">
                {myReservations.map(r => {
                  const meta = STATUS_META[r.status]
                  return (
                    <li key={r.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors">
                      <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 ${meta?.color ?? 'bg-primary'}`}>
                        {meta?.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.service_name ?? t('res.appointment')}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <CalendarDays size={10} />
                          {new Date(r.reservation_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                          <span>·</span>
                          <Clock size={10} />
                          {formatSlotTime(r.reservation_time.slice(0, 5))}
                        </p>
                        {r.admin_notes && (
                          <p className="text-xs text-muted-foreground italic mt-0.5">"{r.admin_notes}"</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] text-white px-2 py-0.5 rounded-full font-medium ${meta?.color ?? 'bg-primary'}`}>
                          {meta?.label}
                        </span>
                        {r.status === 'PENDING' && (
                          confirmCancel.isAsking(r.id) ? (
                            <InlineConfirm label={t('res.cancelReservation')} onConfirm={() => handleCancel(r.id)} onCancel={confirmCancel.cancel} />
                          ) : (
                          <button
                            onClick={() => confirmCancel.ask(r.id)}
                            className="text-[10px] text-red-500 hover:underline"
                          >
                            {t('res.cancelReservation')}
                          </button>
                          )
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Sign-in prompt */}
          {!isAuthenticated && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm text-center">
              <CalendarDays size={32} className="mx-auto mb-3 text-primary/40" />
              <p className="text-sm font-medium mb-1">{t('res.trackTitle')}</p>
              <p className="text-xs text-muted-foreground mb-4">{t('res.trackDesc')}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full max-w-xs bg-primary text-primary-foreground rounded-full py-2.5 text-sm font-semibold hover:opacity-90 transition-all"
              >
                {t('res.signInToBook')}
              </button>
            </div>
          )}
        </div>

        {/* Right — day schedule */}
        {selectedDate && (
          <div ref={scheduleRef} className="flex flex-col gap-4 scroll-mt-4">
            <button
              onClick={() => openRequest(selectedDate)}
              className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
            >
              <CalendarDays size={14} />
              {t('res.bookOnPrefix')} {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </button>

            <DaySchedule
              date={selectedDate}
              slots={daySlots}
              loading={daySlotsLoading}
              isAuthenticated={isAuthenticated}
              onSlotClick={time => openRequest(selectedDate, time)}
            />
          </div>
        )}
      </div>

      {/* ── Booking modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <div>
                <h3 className="text-base font-semibold">{t('res.modalTitle')}</h3>
                {form.reservation_date && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(form.reservation_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    {form.reservation_time && ` · ${formatSlotTime(form.reservation_time)}`}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">

              {/* Service */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('res.serviceLabel')}</label>
                <select
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.service}
                  onChange={e => setForm(f => ({ ...f, service: e.target.value, reservation_time: '' }))}
                >
                  <option value="">{t('res.serviceAny')}</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('res.dateLabel')}</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.reservation_date}
                  onChange={e => setForm(f => ({ ...f, reservation_date: e.target.value, reservation_time: '' }))}
                />
              </div>

              {/* Time slot grid */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('res.timeLabel')}
                  {form.service && services.find(s => String(s.id) === form.service) && (
                    <span className="ml-1.5 font-normal text-muted-foreground text-xs">
                      · {services.find(s => String(s.id) === form.service)?.name}
                    </span>
                  )}
                </label>

                {!form.reservation_date ? (
                  <p className="text-sm text-muted-foreground py-2">{t('res.selectDateFirst')}</p>
                ) : formSlotsLoading ? (
                  <p className="text-sm text-muted-foreground py-2">{t('res.loadingTimes')}</p>
                ) : formSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">{t('res.noSlots')}</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {formSlots.map(slot => {
                      const isSelected = form.reservation_time === slot.time
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setForm(f => ({ ...f, reservation_time: slot.time }))}
                          className={`py-2 px-1 rounded-xl text-xs font-medium transition-all border flex flex-col items-center gap-0.5
                            ${isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-md'
                              : slot.available
                                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                                : 'bg-muted/40 border-border text-muted-foreground line-through cursor-not-allowed opacity-50'
                            }`}
                        >
                          <span>{slot.time}</span>
                          {slot.remaining !== undefined && slot.available && !isSelected && (
                            <span className="text-[9px] opacity-70">{slot.remaining} {t('res.remaining')}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
                <input type="hidden" required value={form.reservation_time} onChange={() => {}} />
                {form.reservation_date && !form.reservation_time && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">{t('res.selectTimeError')}</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('res.notesLabel')} <span className="font-normal text-muted-foreground">{t('res.notesOptional')}</span>
                </label>
                <textarea
                  rows={3}
                  placeholder={t('res.notesPlaceholder')}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary text-primary-foreground rounded-full py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all shadow-md shadow-primary/20"
                >
                  {saving ? t('res.submitting') : t('res.submitBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-border rounded-full py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  {t('res.cancelBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
