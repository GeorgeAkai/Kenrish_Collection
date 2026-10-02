export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type Day = typeof DAYS[number]

export interface Shift { from: string; to: string }
/** null = off that day. Mirrors Employee.schedule on the server. */
export type Schedule = Record<Day, Shift | null>

const SHORT: Record<Day, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
export const FULL: Record<Day, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

/** Mon-Sat 08:00-17:00, Sunday off (same default as the server). */
export function defaultSchedule(): Schedule {
  return Object.fromEntries(DAYS.map(d => [d, d === 'sun' ? null : { from: '08:00', to: '17:00' }])) as Schedule
}

/** "Mon–Fri 08:00–17:00 · Sat 09:00–14:00": consecutive days with the same hours are grouped. */
export function summarizeSchedule(schedule: Schedule): string {
  const groups: { days: Day[]; shift: Shift }[] = []
  for (const day of DAYS) {
    const shift = schedule[day]
    if (!shift) continue
    const last = groups[groups.length - 1]
    const previousDay = DAYS[DAYS.indexOf(day) - 1]
    if (last && last.days[last.days.length - 1] === previousDay && last.shift.from === shift.from && last.shift.to === shift.to) {
      last.days.push(day)
    } else {
      groups.push({ days: [day], shift })
    }
  }
  if (groups.length === 0) return 'No working days'
  return groups
    .map(g => `${g.days.length > 1 ? `${SHORT[g.days[0]]}–${SHORT[g.days[g.days.length - 1]]}` : SHORT[g.days[0]]} ${g.shift.from}–${g.shift.to}`)
    .join(' · ')
}

export function offDayNames(schedule: Schedule): string[] {
  return DAYS.filter(d => !schedule[d]).map(d => FULL[d])
}
