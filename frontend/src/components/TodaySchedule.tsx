import { useEffect, useState } from 'react'
import api from '@/lib/axios'
import { Link } from 'react-router-dom'
import { CalendarCheck, CalendarDays, ChevronRight, Phone } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { SHOP_PHONE_TEL } from '@/lib/stores'
import type { Service } from '@/lib/types'
import { formatSlotTime, type PublicSlot } from '@/lib/slots'


/**
 * Same-day booking card: service chips, a one-line summary, a 3-column grid of
 * time buttons (past hidden, booked struck through) and a sticky gold CTA.
 * `onBook` receives the picked service and time; the page opens BookingModal
 * preset to them.
 */
export default function TodaySchedule({ slots: anySlots, dateKey, services, dateLabel, onBook, calendarHref = '/beauty/reservations', bare = false }: {
  /** Openings across all services (shown for "Any service"). */
  slots: PublicSlot[]
  /** YYYY-MM-DD of the day shown; used to load a chosen service's own time blocks. */
  dateKey: string
  services: Service[]
  dateLabel: string
  onBook: (b: { serviceId: number | null; time: string }) => void
  calendarHref?: string
  /** Drop the card border/shadow when placed inside another panel. */
  bare?: boolean
}) {
  const { t } = useLanguage()
  const [serviceId, setServiceId] = useState<number | null>(null)
  const [time, setTime] = useState<string | null>(null)

  // A chosen service has its own hours, slot length and capacity, so load its blocks
  // (and refresh every minute so booked/past slots stay current).
  const [serviceSlots, setServiceSlots] = useState<PublicSlot[] | null>(null)
  useEffect(() => {
    if (serviceId === null) { setServiceSlots(null); return }
    let cancelled = false
    const load = () => api.get<PublicSlot[]>(`/reservations/public-slots/?date=${dateKey}&service=${serviceId}`)
      .then(r => { if (!cancelled) setServiceSlots(r.data) }).catch(() => {})
    setServiceSlots(null)
    load()
    const id = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [serviceId, dateKey])

  const loadingService = serviceId !== null && serviceSlots === null
  const slots = serviceId === null ? anySlots : (serviceSlots ?? [])

  // Drop a picked time that doesn't exist in the newly chosen service's blocks.
  useEffect(() => {
    if (time && !loadingService && !slots.some(s => s.time === time && s.available)) setTime(null)
  }, [slots, loadingService, time])

  const visible = slots.filter(s => !s.past)
  const open = visible.filter(s => s.available).length
  const booked = visible.filter(s => s.booked).length
  const service = services.find(s => s.id === serviceId)
  const lengths = new Set(visible.map(s => s.duration_minutes ?? null))
  const slotLengthLabel = visible.length === 0 ? '' : lengths.size === 1 && !lengths.has(null)
    ? t('home.slotLengthN', { n: [...lengths][0] as number })
    : t('home.slotsVary')

  function book() {
    if (time) onBook({ serviceId, time })
  }

  const ctaLabel = time
    ? `${t('home.bookAt', { time: formatSlotTime(time) })}${service ? ` · ${service.name}` : ''}`
    : t('home.pickTime')

  return (
    <div className={`bg-card flex flex-col h-full ${bare ? '' : 'border border-border rounded-2xl lg:rounded-[20px] shadow-[0_1px_2px_rgba(60,40,20,.06),0_8px_24px_rgba(60,40,20,.06)]'}`}>
      <div className={`p-4 sm:p-6 pb-0 sm:pb-0 ${bare ? 'lg:p-10 lg:pb-0' : ''}`}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-heading text-xl font-semibold leading-tight">{t('home.todaysOpenings')}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{dateLabel}</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-success bg-success-tint px-2.5 py-1 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            {t('home.live')}
          </span>
        </div>

        {services.length > 0 && (
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 mb-3 [scrollbar-width:none]">
            {[{ id: null as number | null, name: t('home.anyService') }, ...services.map(s => ({ id: s.id as number | null, name: s.name }))].map(s => (
              <button key={s.id ?? 'any'} type="button" onClick={() => setServiceId(s.id)}
                aria-pressed={serviceId === s.id}
                className={`h-9 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-colors
                  ${serviceId === s.id ? 'bg-inverse text-inverse-foreground border-inverse' : 'bg-card border-border-control text-foreground hover:bg-secondary'}`}>
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {loadingService ? (
        <p className="flex-1 px-4 sm:px-6 py-10 text-center text-sm text-muted-foreground">…</p>
      ) : slots.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
          <CalendarDays size={32} className="text-muted-foreground/40 mb-3" />
          <p className="text-sm font-semibold">{serviceId !== null ? t('home.noOpeningsService') : t('home.closedSunday')}</p>
          <p className="text-sm text-muted-foreground mt-1">{serviceId !== null ? t('home.tryAnotherService') : t('home.checkBackDays')}</p>
          <Link to={calendarHref} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold-ink hover:underline">
            {t('home.browseFuture')} <ChevronRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          <p className="px-4 sm:px-6 text-[13px] text-muted-foreground mb-3">
            <span className="font-semibold text-success">{t('home.openCount', { n: open })}</span>
            {' · '}{t('home.bookedCount', { n: booked })}{slotLengthLabel && ` · ${slotLengthLabel}`}
          </p>
          {visible.length === 0 ? (
            <p className="px-4 sm:px-6 pb-4 text-sm text-muted-foreground">{t('home.noMoreToday')}</p>
          ) : (
            <div className="px-4 sm:px-6 grid grid-cols-3 gap-2 pb-4">
              {visible.map(s => {
                const selected = time === s.time
                return (
                  <button key={s.time} type="button" disabled={!s.available}
                    onClick={() => setTime(selected ? null : s.time)}
                    aria-pressed={selected}
                    className={`h-12 rounded-lg text-sm font-semibold tabular-nums transition-colors flex flex-col items-center justify-center leading-tight
                      ${selected ? 'bg-inverse text-inverse-foreground'
                        : s.available ? 'bg-card border border-border-control text-foreground hover:bg-gold-tint'
                        : 'bg-secondary text-muted-foreground line-through cursor-not-allowed'}`}>
                    {formatSlotTime(s.time)}
                    {!s.available && <span className="text-[10px] font-medium">{t('home.slotBooked')}</span>}
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Sticky CTA, stays in the thumb zone while the grid scrolls */}
      <div className="sticky lg:static bottom-0 mt-auto bg-card/95 backdrop-blur rounded-b-2xl lg:rounded-b-[20px] border-t border-border px-4 sm:px-6 pt-3 pb-3 pb-safe">
        <button type="button" onClick={book} disabled={!time}
          className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold text-[15px] flex items-center justify-center gap-2 transition-colors hover:bg-gold-deep disabled:opacity-50 disabled:cursor-not-allowed">
          <CalendarCheck size={17} /> {ctaLabel}
        </button>
        <a href={SHOP_PHONE_TEL} className="mt-2 flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
          <Phone size={13} /> {t('home.orCall')}
        </a>
      </div>
    </div>
  )
}
