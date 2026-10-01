import { NAIROBI_TZ } from '@/lib/utils'

/** Trading hours, matching the footer ("Mon–Sat 7:30AM–7PM"). Minutes since midnight, Nairobi time. */
export const SHOP_OPEN_MIN = 7 * 60 + 30
export const SHOP_CLOSE_MIN = 19 * 60
/** 0 = Sunday … 6 = Saturday. */
export const SHOP_CLOSED_DAYS = [0]

export interface ShopStatus {
  open: boolean
  /** Minutes until closing (when open). */
  closesInMin: number | null
  /** Next opening: how many calendar days ahead (0 = later today) and the time. */
  nextOpen: { daysAhead: number; minutes: number } | null
}

/** Nairobi wall-clock parts for an instant. */
export function nairobiParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: NAIROBI_TZ, weekday: 'short', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
  }).formatToParts(now)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  return { weekday, hour: Number(get('hour')), minute: Number(get('minute')), second: Number(get('second')) }
}

/** Whether the shop is open at `now`, and when it next opens or closes. Always judged in Nairobi time. */
export function shopStatus(now: Date = new Date()): ShopStatus {
  const { weekday, hour, minute } = nairobiParts(now)
  const minutes = hour * 60 + minute
  const openToday = !SHOP_CLOSED_DAYS.includes(weekday)

  if (openToday && minutes >= SHOP_OPEN_MIN && minutes < SHOP_CLOSE_MIN) {
    return { open: true, closesInMin: SHOP_CLOSE_MIN - minutes, nextOpen: null }
  }
  if (openToday && minutes < SHOP_OPEN_MIN) {
    return { open: false, closesInMin: null, nextOpen: { daysAhead: 0, minutes: SHOP_OPEN_MIN } }
  }
  for (let ahead = 1; ahead <= 7; ahead++) {
    if (!SHOP_CLOSED_DAYS.includes((weekday + ahead) % 7)) {
      return { open: false, closesInMin: null, nextOpen: { daysAhead: ahead, minutes: SHOP_OPEN_MIN } }
    }
  }
  return { open: false, closesInMin: null, nextOpen: null }
}
