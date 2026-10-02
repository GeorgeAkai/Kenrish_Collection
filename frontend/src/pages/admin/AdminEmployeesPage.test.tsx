import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import { ToastProvider } from '@/contexts/ToastContext'
import { defaultSchedule } from '@/lib/schedule'
import type { Employee, EmployeeDashboard } from '@/lib/types'
import AdminEmployeesPage from './AdminEmployeesPage'

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))

const emp = (over: Partial<Employee>): Employee => ({
  id: 1, name: 'Wanjiru Kamau', phone: '+254712345678', email: '', start_date: '2026-03-01', end_date: null,
  monthly_salary: '18000.00', shop: 'beauty', schedule: defaultSchedule(), off_days: ['sun'], is_active: true,
  works_today: true, created_at: '2026-03-01T08:00:00Z', ...over,
})

let employees: Employee[]
let dashboard: EmployeeDashboard

beforeEach(() => {
  employees = [
    emp({}),
    emp({ id: 2, name: 'Achieng Otieno', shop: 'fashion', monthly_salary: '15000.00', works_today: false, off_days: ['wed', 'sun'], schedule: { ...defaultSchedule(), wed: null } }),
    emp({ id: 3, name: 'Peter Mwangi', shop: 'both', is_active: false, end_date: '2026-08-31', works_today: false }),
  ]
  dashboard = {
    on_shift_today: [{ id: 1, name: 'Wanjiru Kamau', shop: 'beauty', shift: { from: '08:00', to: '17:00' } }],
    off_today: [{ id: 2, name: 'Achieng Otieno', shop: 'fashion', shift: null }],
    total_monthly_payroll: '33000.00',
    headcount: { beauty: 1, fashion: 1, both: 0, total: 2 },
  }
  vi.mocked(api.get).mockReset().mockImplementation(async (url: string) => {
    if (url === '/admin/employees/') return { data: employees }
    if (url === '/admin/employees/dashboard/') return { data: dashboard }
    return { data: [] }
  })
  vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} })
  vi.mocked(api.patch).mockReset().mockResolvedValue({ data: {} })
  vi.mocked(api.delete).mockReset().mockResolvedValue({ data: {} })
})

const renderPage = () => render(<ToastProvider><AdminEmployeesPage /></ToastProvider>)

describe('AdminEmployeesPage', () => {
  it('shows the payroll total and headcount for each shop', async () => {
    renderPage()
    const tiles = await screen.findByRole('region', { name: /staff overview/i })
    expect(await within(tiles).findByText('KES 33,000.00')).toBeInTheDocument()
    expect(within(tiles).getByText('2 on payroll')).toBeInTheDocument()
    expect(within(tiles).getByLabelText('Beauty headcount')).toHaveTextContent('1')
    expect(within(tiles).getByLabelText('Fashion headcount')).toHaveTextContent('1')
    expect(within(tiles).getByLabelText('Both shops headcount')).toHaveTextContent('0')
  })

  it('shows who is on shift today with their hours, and who is off', async () => {
    renderPage()
    const onShift = await screen.findByRole('region', { name: /on shift today/i })
    expect(await within(onShift).findByText('Wanjiru Kamau')).toBeInTheDocument()
    expect(within(onShift).getByText('08:00–17:00')).toBeInTheDocument()
    const off = screen.getByRole('region', { name: /off today/i })
    expect(await within(off).findByText('Achieng Otieno')).toBeInTheDocument()
  })

  it('lists employees with shop, salary, schedule and days off, marking those who have left', async () => {
    renderPage()
    const list = await screen.findByRole('list', { name: /all employees/i })
    const row = (await within(list).findByText('Achieng Otieno')).closest('li')!
    expect(within(row).getByText('Fashion')).toBeInTheDocument()
    expect(within(row).getByText('KES 15,000.00 / month')).toBeInTheDocument()
    expect(within(row).getByText(/Off: Wednesday, Sunday/)).toBeInTheDocument()
    const left = within(list).getByText('Peter Mwangi').closest('li')!
    expect(within(left).getByText(/left 31\/08\/2026/i)).toBeInTheDocument()
    expect(within(left).getByText('Both shops')).toBeInTheDocument()
  })

  it('adds an employee and refreshes', async () => {
    renderPage()
    await screen.findByRole('list', { name: /all employees/i })
    await screen.findAllByText('Wanjiru Kamau')
    const before = vi.mocked(api.get).mock.calls.filter(c => c[0] === '/admin/employees/').length
    await userEvent.click(screen.getByRole('button', { name: /add employee/i }))
    await userEvent.type(await screen.findByLabelText(/^name/i), 'New Hire')
    await userEvent.type(screen.getByLabelText(/start date/i), '2026-10-01')
    await userEvent.type(screen.getByLabelText(/monthly salary/i), '12000')
    await userEvent.click(screen.getByRole('button', { name: /save employee/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/admin/employees/', expect.objectContaining({ name: 'New Hire' })))
    await waitFor(() => expect(vi.mocked(api.get).mock.calls.filter(c => c[0] === '/admin/employees/').length).toBeGreaterThan(before))
  })

  it('edits an employee through the form', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /edit wanjiru kamau/i }))
    await userEvent.clear(await screen.findByLabelText(/monthly salary/i))
    await userEvent.type(screen.getByLabelText(/monthly salary/i), '20000')
    await userEvent.click(screen.getByRole('button', { name: /save employee/i }))
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/admin/employees/1/', { monthly_salary: '20000' }))
  })

  it('opens the change history of an employee', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /history of wanjiru kamau/i }))
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/admin/audit/', { params: { kind: 'employee', ref: 1 } }))
  })

  it('deletes only after confirmation', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /delete achieng otieno/i }))
    expect(api.delete).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/admin/employees/2/'))
  })

  it('invites the admin to add the first employee when there are none', async () => {
    employees = []
    dashboard = { ...dashboard, on_shift_today: [], off_today: [], headcount: { beauty: 0, fashion: 0, both: 0, total: 0 }, total_monthly_payroll: '0.00' }
    renderPage()
    expect(await screen.findByText(/no employees yet/i)).toBeInTheDocument()
  })
})
