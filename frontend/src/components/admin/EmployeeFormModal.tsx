import { useState, type FormEvent } from 'react'
import api from '@/lib/axios'
import { DAYS, FULL, defaultSchedule, type Day, type Schedule } from '@/lib/schedule'
import type { Employee } from '@/lib/types'
import { apiErrorMessage } from './ExpenseFormModal'
import ModalShell from './ModalShell'

const inputCls = 'w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring'
const DEFAULT_SHIFT = { from: '08:00', to: '17:00' }

/** Add or edit an employee, including the weekly schedule (the off day is simply a day left unticked). */
export default function EmployeeFormModal({ employee, onClose, onSaved }: {
  employee?: Employee
  onClose: () => void
  onSaved: (employee: Employee) => void
}) {
  const [form, setForm] = useState({
    name: employee?.name ?? '',
    phone: employee?.phone ?? '',
    email: employee?.email ?? '',
    start_date: employee?.start_date ?? '',
    end_date: employee?.end_date ?? '',
    monthly_salary: employee?.monthly_salary ?? '',
    shop: employee?.shop ?? 'both',
  })
  const [schedule, setSchedule] = useState<Schedule>(employee?.schedule ?? defaultSchedule())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleDay(day: Day) {
    setSchedule(s => ({ ...s, [day]: s[day] ? null : { ...DEFAULT_SHIFT } }))
  }

  function setTime(day: Day, field: 'from' | 'to', value: string) {
    setSchedule(s => ({ ...s, [day]: { ...(s[day] ?? DEFAULT_SHIFT), [field]: value } }))
  }

  // When editing, send only what changed so the audit trail shows real corrections.
  const changes: Record<string, unknown> = {}
  if (employee) {
    if (form.name !== employee.name) changes.name = form.name
    if (form.phone !== employee.phone) changes.phone = form.phone
    if (form.email !== employee.email) changes.email = form.email
    if (form.start_date !== employee.start_date) changes.start_date = form.start_date
    if (form.end_date !== (employee.end_date ?? '')) changes.end_date = form.end_date || null
    if (form.monthly_salary !== '' && Number(form.monthly_salary) !== Number(employee.monthly_salary)) changes.monthly_salary = form.monthly_salary
    if (form.shop !== employee.shop) changes.shop = form.shop
    if (JSON.stringify(schedule) !== JSON.stringify(employee.schedule)) changes.schedule = schedule
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { data } = employee
        ? await api.patch(`/admin/employees/${employee.id}/`, changes)
        : await api.post('/admin/employees/', { ...form, end_date: form.end_date || null, schedule })
      onSaved(data)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the employee.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title={employee ? 'Edit employee' : 'Add employee'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 max-w-lg">
        <div>
          <label htmlFor="emp-name" className="block text-sm font-medium mb-1">Name</label>
          <input id="emp-name" required className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="emp-phone" className="block text-sm font-medium mb-1">Phone <span className="font-normal text-muted-foreground">(optional)</span></label>
            <input id="emp-phone" type="tel" className={inputCls} placeholder="0712 345 678" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <label htmlFor="emp-email" className="block text-sm font-medium mb-1">Email <span className="font-normal text-muted-foreground">(optional)</span></label>
            <input id="emp-email" type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="emp-start" className="block text-sm font-medium mb-1">Start date</label>
            <input id="emp-start" type="date" required className={inputCls} value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div>
            <label htmlFor="emp-end" className="block text-sm font-medium mb-1">Last day <span className="font-normal text-muted-foreground">(leave blank if still employed)</span></label>
            <input id="emp-end" type="date" min={form.start_date || undefined} className={inputCls} value={form.end_date} onChange={e => set('end_date', e.target.value)} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="emp-salary" className="block text-sm font-medium mb-1">Monthly salary (KES)</label>
            <input id="emp-salary" type="number" required min="1" step="any" className={inputCls} value={form.monthly_salary} onChange={e => set('monthly_salary', e.target.value)} />
          </div>
          <div>
            <label htmlFor="emp-shop" className="block text-sm font-medium mb-1">Works in</label>
            <select id="emp-shop" className={inputCls} value={form.shop} onChange={e => set('shop', e.target.value)}>
              <option value="both">Both shops</option>
              <option value="beauty">Beauty</option>
              <option value="fashion">Fashion</option>
            </select>
          </div>
        </div>

        <fieldset className="border rounded-md p-3">
          <legend className="px-1 text-sm font-medium">Weekly schedule</legend>
          <p className="text-xs text-muted-foreground mb-2">Tick the days they work. An unticked day is their day off.</p>
          <ul className="space-y-1.5">
            {DAYS.map(day => (
              <li key={day} className="flex items-center gap-3 text-sm">
                <label className="flex items-center gap-2 w-32">
                  <input type="checkbox" aria-label={`Works on ${FULL[day]}`} checked={!!schedule[day]} onChange={() => toggleDay(day)} />
                  {FULL[day]}
                </label>
                {schedule[day] ? (
                  <span className="flex items-center gap-2">
                    <input type="time" aria-label={`${FULL[day]} start time`} className="border rounded px-2 py-1 text-sm bg-background"
                      value={schedule[day]!.from} onChange={e => setTime(day, 'from', e.target.value)} />
                    <span className="text-muted-foreground">to</span>
                    <input type="time" aria-label={`${FULL[day]} end time`} className="border rounded px-2 py-1 text-sm bg-background"
                      value={schedule[day]!.to} onChange={e => setTime(day, 'to', e.target.value)} />
                  </span>
                ) : <span className="text-muted-foreground">Day off</span>}
              </li>
            ))}
          </ul>
        </fieldset>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving || (!!employee && Object.keys(changes).length === 0)} className="btn-modern btn-modern--primary">
          {saving ? 'Saving…' : 'Save employee'}
        </button>
      </form>
    </ModalShell>
  )
}
