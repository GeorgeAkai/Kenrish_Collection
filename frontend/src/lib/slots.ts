export interface PublicSlot { time: string; available: boolean; booked: boolean; past: boolean }

/** "14:30" → "2:30 PM" */
export function formatSlotTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
