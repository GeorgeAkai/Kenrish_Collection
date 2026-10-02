import { useCallback, useEffect, useState } from 'react'
import { CalendarOff, History, Mail, Pencil, Phone, Plus, Trash2, Users } from 'lucide-react'
import api from '@/lib/axios'
import { offDayNames, summarizeSchedule } from '@/lib/schedule'
import { formatDate, formatKES } from '@/lib/utils'
import type { Employee, EmployeeDashboard, EmployeeShiftCard } from '@/lib/types'
import AuditHistoryModal from '@/components/admin/AuditHistoryModal'
import EmployeeFormModal from '@/components/admin/EmployeeFormModal'
import InlineConfirm from '@/components/InlineConfirm'
import { useConfirm } from '@/hooks/useConfirm'
import { useToast } from '@/contexts/ToastContext'

const SHOP_LABEL: Record<Employee['shop'], string> = { beauty: 'Beauty', fashion: 'Fashion', both: 'Both shops' }
const iconBtn = 'w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors'

function Tile({ label, value, sub, ariaLabel }: { label: string; value: string; sub?: string; ariaLabel?: string }) {
  return (
    <div className="border rounded-xl p-4 bg-card" aria-label={ariaLabel}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function ShiftList({ title, people, empty }: { title: string; people: EmployeeShiftCard[]; empty: string }) {
  return (
    <section aria-label={title} className="border rounded-xl p-4 bg-card">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {people.length === 0 && <p className="text-sm text-muted-foreground">{empty}</p>}
      <ul className="space-y-1.5">
        {people.map(p => (
          <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
            <span>{p.name}</span>
            <span className="text-muted-foreground">{p.shift ? `${p.shift.from}–${p.shift.to}` : SHOP_LABEL[p.shop]}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Staff list and dashboard. Salaries post themselves as expenses each month (see the Expenses pages). */
export default function AdminEmployeesPage() {
  const toast = useToast()
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [dashboard, setDashboard] = useState<EmployeeDashboard | null>(null)
  const [form, setForm] = useState<{ employee?: Employee } | null>(null)
  const [history, setHistory] = useState<Employee | null>(null)
  const del = useConfirm<number>()

  const load = useCallback(() => {
    // The list goes first: opening it also posts this month's salaries, which the dashboard totals then include.
    api.get<Employee[]>('/admin/employees/').then(r => setEmployees(r.data)).catch(console.error)
    api.get<EmployeeDashboard>('/admin/employees/dashboard/').then(r => setDashboard(r.data)).catch(console.error)
  }, [])

  useEffect(load, [load])

  async function remove(id: number) {
    del.cancel()
    try {
      await api.delete(`/admin/employees/${id}/`)
      load()
    } catch {
      toast.error('Could not delete the employee.')
    }
  }

  const headcount = dashboard?.headcount
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Employees</h2>
          <p className="text-sm text-muted-foreground">Each month's salary is added to Expenses automatically, prorated for part months.</p>
        </div>
        <button onClick={() => setForm({})} className="btn-modern btn-modern--primary flex items-center gap-1.5">
          <Plus size={16} /> Add employee
        </button>
      </div>

      <section aria-label="Staff overview" className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <div className="col-span-2 lg:col-span-2">
          <Tile label="Monthly payroll" value={formatKES(dashboard?.total_monthly_payroll ?? 0)} sub={`${headcount?.total ?? 0} on payroll`} />
        </div>
        <Tile label="Beauty" value={String(headcount?.beauty ?? 0)} ariaLabel="Beauty headcount" />
        <Tile label="Fashion" value={String(headcount?.fashion ?? 0)} ariaLabel="Fashion headcount" />
        <Tile label="Both shops" value={String(headcount?.both ?? 0)} ariaLabel="Both shops headcount" />
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <ShiftList title="On shift today" people={dashboard?.on_shift_today ?? []} empty="Nobody is scheduled today." />
        <ShiftList title="Off today" people={dashboard?.off_today ?? []} empty="Everyone is working today." />
      </div>

      <ul aria-label="All employees" className="space-y-2">
        {employees && employees.length === 0 && (
          <li className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Users size={28} className="opacity-40" /> No employees yet. Add your first one!
          </li>
        )}
        {employees?.map(e => (
          <li key={e.id} className={`border rounded-xl p-3 bg-card flex flex-wrap items-center gap-x-4 gap-y-2 ${e.is_active ? '' : 'opacity-70'}`}>
            <div className="flex-1 min-w-[14rem]">
              <p className="font-medium text-sm flex flex-wrap items-center gap-2">
                {e.name}
                <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[11px] font-medium">{SHOP_LABEL[e.shop]}</span>
                {!e.is_active && e.end_date && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-medium">Left {formatDate(e.end_date)}</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{summarizeSchedule(e.schedule)}</p>
              <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 mt-0.5">
                <span className="inline-flex items-center gap-1"><CalendarOff size={11} /> Off: {offDayNames(e.schedule).join(', ') || 'none'}</span>
                {e.phone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {e.phone}</span>}
                {e.email && <span className="inline-flex items-center gap-1"><Mail size={11} /> {e.email}</span>}
              </p>
            </div>
            <p className="text-sm font-semibold min-w-[9rem] text-right">{formatKES(e.monthly_salary)} / month</p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setHistory(e)} aria-label={`History of ${e.name}`} className={iconBtn}><History size={13} /></button>
              <button onClick={() => setForm({ employee: e })} aria-label={`Edit ${e.name}`} className={iconBtn}><Pencil size={13} /></button>
              {del.isAsking(e.id)
                ? <InlineConfirm onConfirm={() => remove(e.id)} onCancel={del.cancel} />
                : <button onClick={() => del.ask(e.id)} aria-label={`Delete ${e.name}`} className={`${iconBtn} text-red-600`}><Trash2 size={13} /></button>}
            </div>
          </li>
        ))}
      </ul>

      {form && <EmployeeFormModal employee={form.employee} onClose={() => setForm(null)} onSaved={() => { setForm(null); load() }} />}
      {history && <AuditHistoryModal kind="employee" objectRef={history.id} title={history.name} onClose={() => setHistory(null)} />}
    </div>
  )
}
