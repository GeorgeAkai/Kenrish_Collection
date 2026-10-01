import { shopStatus } from './shopHours'

// Nairobi is UTC+3 all year, so 07:30 Nairobi = 04:30 UTC.
const at = (iso: string) => new Date(iso)

describe('shopStatus (Nairobi time)', () => {
  it('is open mid-morning on a weekday and reports minutes to closing', () => {
    // Wed 30 Sep 2026, 10:00 Nairobi
    const s = shopStatus(at('2026-09-30T07:00:00Z'))
    expect(s.open).toBe(true)
    expect(s.closesInMin).toBe(9 * 60)
  })

  it('opens at 07:30 sharp and closes at 19:00 sharp', () => {
    expect(shopStatus(at('2026-09-30T04:30:00Z')).open).toBe(true)
    expect(shopStatus(at('2026-09-30T04:29:00Z')).open).toBe(false)
    expect(shopStatus(at('2026-09-30T15:59:00Z')).open).toBe(true)
    expect(shopStatus(at('2026-09-30T16:00:00Z')).open).toBe(false)
  })

  it('before opening says it opens later today', () => {
    const s = shopStatus(at('2026-09-30T03:00:00Z')) // 06:00 Nairobi
    expect(s.nextOpen).toEqual({ daysAhead: 0, minutes: 450 })
  })

  it('after closing on Saturday skips Sunday and opens Monday', () => {
    // Sat 3 Oct 2026, 20:00 Nairobi
    const s = shopStatus(at('2026-10-03T17:00:00Z'))
    expect(s.open).toBe(false)
    expect(s.nextOpen).toEqual({ daysAhead: 2, minutes: 450 })
  })

  it('is closed all day Sunday and opens tomorrow', () => {
    const s = shopStatus(at('2026-10-04T09:00:00Z')) // Sun 12:00 Nairobi
    expect(s.open).toBe(false)
    expect(s.nextOpen).toEqual({ daysAhead: 1, minutes: 450 })
  })

  it('uses Nairobi, not UTC, for the day: Sat 22:00 UTC is already Sunday 01:00', () => {
    const s = shopStatus(at('2026-10-03T22:00:00Z'))
    expect(s.open).toBe(false)
    expect(s.nextOpen?.daysAhead).toBe(1)
  })
})
