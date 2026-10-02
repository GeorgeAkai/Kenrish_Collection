import { describe, expect, it } from 'vitest'
import { DAYS, defaultSchedule, offDayNames, summarizeSchedule, type Schedule } from './schedule'

const shift = (from: string, to: string) => ({ from, to })

describe('summarizeSchedule', () => {
  it('collapses consecutive days with the same hours into a range', () => {
    expect(summarizeSchedule(defaultSchedule())).toBe('Mon–Sat 08:00–17:00')
  })

  it('lists different hours separately', () => {
    const s: Schedule = { ...defaultSchedule(), sat: shift('09:00', '14:00') }
    expect(summarizeSchedule(s)).toBe('Mon–Fri 08:00–17:00 · Sat 09:00–14:00')
  })

  it('handles non-consecutive working days', () => {
    const s: Schedule = { ...defaultSchedule(), wed: null }
    expect(summarizeSchedule(s)).toBe('Mon–Tue 08:00–17:00 · Thu–Sat 08:00–17:00')
  })

  it('says so when nobody works any day', () => {
    const none = Object.fromEntries(DAYS.map(d => [d, null])) as Schedule
    expect(summarizeSchedule(none)).toBe('No working days')
  })
})

describe('offDayNames', () => {
  it('names the days off in full, in week order', () => {
    expect(offDayNames({ ...defaultSchedule(), wed: null })).toEqual(['Wednesday', 'Sunday'])
    expect(offDayNames(defaultSchedule())).toEqual(['Sunday'])
  })
})
