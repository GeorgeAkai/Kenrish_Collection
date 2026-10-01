import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { NAIROBI_TZ } from '@/lib/utils'
import { shopStatus, SHOP_CLOSE_MIN } from '@/lib/shopHours'

/** Small live clock (Nairobi time) with an Open / Closed badge. */
export default function ShopStatusWatch() {
  const { t, lang } = useLanguage()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const locale = lang === 'sw' ? 'sw-KE' : 'en-KE'
  const clock = now.toLocaleTimeString(locale, { timeZone: NAIROBI_TZ, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
  const status = shopStatus(now)

  const clockTime = (minutes: number) => {
    const d = new Date(Date.UTC(2000, 0, 1, Math.floor(minutes / 60), minutes % 60))
    return d.toLocaleTimeString(locale, { timeZone: 'UTC', hour: 'numeric', minute: '2-digit', hour12: true })
  }

  let detail = ''
  if (status.open && status.closesInMin !== null) {
    detail = status.closesInMin <= 60
      ? t('shop.closesInMin', { n: status.closesInMin })
      : t('shop.closesAt', { time: clockTime(SHOP_CLOSE_MIN) })
  } else if (status.nextOpen) {
    const { daysAhead, minutes } = status.nextOpen
    const time = clockTime(minutes)
    if (daysAhead === 0) detail = t('shop.opensToday', { time })
    else if (daysAhead === 1) detail = t('shop.opensTomorrow', { time })
    else {
      const day = new Date(now.getTime() + daysAhead * 86_400_000)
        .toLocaleDateString(locale, { timeZone: NAIROBI_TZ, weekday: 'long' })
      detail = t('shop.opensDay', { day, time })
    }
  }

  return (
    <div className="flex justify-center px-4 pt-3 pb-1 bg-card/60" role="status" aria-live="off">
      <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-border bg-card px-4 py-1.5 text-[13px] shadow-sm">
        <span className={`inline-flex items-center gap-1.5 font-bold ${status.open ? 'text-success' : 'text-danger'}`}>
          <span className={`w-2 h-2 rounded-full bg-current ${status.open ? 'animate-pulse' : ''}`} />
          {status.open ? t('shop.openNow') : t('shop.closedNow')}
        </span>
        {detail && <span className="text-muted-foreground">{detail}</span>}
        <span className="hidden sm:block w-px h-4 bg-border" />
        <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums" aria-label={`${t('shop.timeLabel')} ${clock}`}>
          <Clock size={14} strokeWidth={1.75} className="text-muted-foreground" />
          {clock}
          <span className="text-[11px] font-medium text-muted-foreground">{t('shop.timeLabel')}</span>
        </span>
      </div>
    </div>
  )
}
