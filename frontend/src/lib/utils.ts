import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKES(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `KES ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Price for an item that may sell across a range (e.g. a bale of jackets priced piece by piece).
 * `price` is the bottom of the range. 'range' shows both ends, 'from' shows only the bottom (for lists).
 */
export function formatPriceRange(
  price: string | number,
  maxPrice?: string | number | null,
  style: 'range' | 'from' = 'range',
  fromLabel = 'From',
): string {
  const low = Number(price)
  const high = maxPrice == null || maxPrice === '' ? null : Number(maxPrice)
  if (high === null || high <= low) return formatKES(price)
  if (style === 'from') return `${fromLabel} ${formatKES(price)}`
  return `${formatKES(price)} – ${high.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** The shop runs on Nairobi time (UTC+3, no DST) whatever the visitor's device clock says. */
export const NAIROBI_TZ = 'Africa/Nairobi'

/** Nairobi calendar date as "YYYY-MM-DD" (en-CA formats dates ISO-style). */
export function nairobiDateKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: NAIROBI_TZ }).format(d)
}

/** "Wednesday, September 30" for today (or `d`) in Nairobi. */
export function nairobiDayLabel(d: Date = new Date(), locale?: string): string {
  return d.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', timeZone: NAIROBI_TZ })
}

/** ISO instant -> "YYYY-MM-DDTHH:mm" Nairobi wall-clock, for <input type="datetime-local">. */
export function toNairobiInput(iso?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: NAIROBI_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(iso ? new Date(iso) : new Date())
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/** Nairobi wall-clock "YYYY-MM-DDTHH:mm" -> ISO instant (Kenya is fixed UTC+3). */
export function fromNairobiInput(local: string): string {
  return new Date(`${local}:00+03:00`).toISOString()
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-KE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: NAIROBI_TZ })
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString('en-KE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: NAIROBI_TZ })
}

export function stars(rating: number): string {
  const full = Math.round(rating)
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

const VIDEO_EXTS = ['.mp4', '.mov', '.avi', '.webm', '.mkv']

export function isVideoUrl(url: string | null | undefined, flagFromApi?: boolean): boolean {
  if (flagFromApi) return true
  if (!url) return false
  const clean = url.split('?')[0].toLowerCase()
  return VIDEO_EXTS.some(ext => clean.endsWith(ext))
}

/** Whole shillings for dashboards and KPIs: "KES 1,450". */
export function formatKESWhole(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `KES ${Math.round(num || 0).toLocaleString('en-KE')}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Chart bucket label -> readable date: "2026-09-12" -> "12 Sep 2026", "2026-09" -> "Sep 2026". */
export function formatChartDate(bucket: string): string {
  const [y, m, d] = bucket.split('-')
  if (!y || !m) return bucket
  const month = MONTHS[Number(m) - 1] ?? m
  return d ? `${Number(d)} ${month} ${y}` : `${month} ${y}`
}

const PERIOD_DAYS: Record<string, number> = { today: 0, week: 7, month: 30, quarter: 90, year: 365 }

/** The dates an analytics period covers, matching the server's window: "1 Sep 2026 – 30 Sep 2026". */
export function formatPeriodRange(period: string, now = new Date()): string {
  // Work on the Nairobi calendar date, at noon UTC so day arithmetic can't hit a boundary.
  const [y, m, d] = nairobiDateKey(now).split('-').map(Number)
  const end = new Date(Date.UTC(y, m - 1, d, 12))
  const fmt = (x: Date) => `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`
  const days = PERIOD_DAYS[period] ?? 30
  if (days === 0) return fmt(end)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - days)
  return `${fmt(start)} – ${fmt(end)}`
}
