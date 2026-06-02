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
