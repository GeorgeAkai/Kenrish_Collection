import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKES(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `KES ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-KE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString('en-KE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
  const fmt = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
  const days = PERIOD_DAYS[period] ?? 30
  if (days === 0) return fmt(now)
  const start = new Date(now)
  start.setDate(start.getDate() - days)
  return `${fmt(start)} – ${fmt(now)}`
}
