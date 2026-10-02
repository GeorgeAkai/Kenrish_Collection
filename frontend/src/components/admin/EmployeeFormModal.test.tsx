import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import { defaultSchedule } from '@/lib/schedule'
import type { Employee } from '@/lib/types'
import EmployeeFormModal from './EmployeeFormModal'

vi.mock('@/lib/axios', () => ({ default: { post: vi.fn(), patch: vi.fn() } }))

const wanjiru: Employee = {
  id: 3, name: 'Wanjiru Kamau', phone: '+254712345678', email: 'w@example.com', start_date: '2026-03-01', end_date: null,
  monthly_salary: '18000.00', shop: 'beauty', schedule: defaultSchedule(), off_days: ['sun'], is_active: true, works_today: true,
  created_at: '2026-03-01T08:00:00Z',
}

beforeEach(() => {
  vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} })
  vi.mocked(api.patch).mockReset().mockResolvedValue({ data: {} })
})

describe('EmployeeFormModal', () => {
  it('adds an employee with the default Mon-Sat schedule', async () => {
    const onSaved = vi.fn()
    render(<EmployeeFormModal onClose={vi.fn()} onSaved={onSaved} />)
    await userEvent.type(screen.getByLabelText(/^name/i), 'Achieng Otieno')
    await userEvent.type(screen.getByLabelText(/phone/i), '0722111333')
    await userEvent.type(screen.getByLabelText(/start date/i), '2026-10-01')
    await userEvent.type(screen.getByLabelText(/monthly salary/i), '15000')
    await userEvent.selectOptions(screen.getByLabelText(/works in/i), 'fashion')
    await userEvent.click(screen.getByRole('button', { name: /save employee/i }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(api.post).toHaveBeenCalledWith('/admin/employees/', {
      name: 'Achieng Otieno', phone: '0722111333', email: '', start_date: '2026-10-01', end_date: null,
      monthly_salary: '15000', shop: 'fashion', schedule: defaultSchedule(),
    })
  })

  it('offers Beauty, Fashion and Both shops', () => {
    render(<EmployeeFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    const options = Array.from(screen.getByLabelText(/works in/i).querySelectorAll('option')).map(o => o.textContent)
    expect(options).toEqual(['Both shops', 'Beauty', 'Fashion'])
  })

  it('lets the admin set the off day and the hours for each day', async () => {
    render(<EmployeeFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByLabelText('Works on Sunday')).not.toBeChecked()
    expect(screen.getByLabelText('Works on Monday')).toBeChecked()

    await userEvent.click(screen.getByLabelText('Works on Wednesday'))   // off day
    await userEvent.click(screen.getByLabelText('Works on Sunday'))      // now works Sundays
    const satFrom = screen.getByLabelText('Saturday start time')
    await userEvent.clear(satFrom)
    await userEvent.type(satFrom, '10:00')

    await userEvent.type(screen.getByLabelText(/^name/i), 'X')
    await userEvent.type(screen.getByLabelText(/start date/i), '2026-10-01')
    await userEvent.type(screen.getByLabelText(/monthly salary/i), '1000')
    await userEvent.click(screen.getByRole('button', { name: /save employee/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalled())
    const sent = (vi.mocked(api.post).mock.calls[0][1] as { schedule: Record<string, unknown> }).schedule
    expect(sent.wed).toBeNull()
    expect(sent.sun).toEqual({ from: '08:00', to: '17:00' })
    expect(sent.sat).toEqual({ from: '10:00', to: '17:00' })
  })

  it('the last day cannot be before the start date, and a salary must be positive', async () => {
    render(<EmployeeFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    await userEvent.type(screen.getByLabelText(/start date/i), '2026-10-01')
    expect(screen.getByLabelText(/last day/i)).toHaveAttribute('min', '2026-10-01')
    expect(screen.getByLabelText(/monthly salary/i)).toHaveAttribute('min', '1')
  })

  it('editing prefills the form and sends only what changed', async () => {
    render(<EmployeeFormModal employee={wanjiru} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByLabelText(/^name/i)).toHaveValue('Wanjiru Kamau')
    expect(screen.getByRole('button', { name: /save employee/i })).toBeDisabled()

    await userEvent.clear(screen.getByLabelText(/monthly salary/i))
    await userEvent.type(screen.getByLabelText(/monthly salary/i), '20000')
    await userEvent.type(screen.getByLabelText(/last day/i), '2026-12-31')
    await userEvent.click(screen.getByRole('button', { name: /save employee/i }))
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/admin/employees/3/', { monthly_salary: '20000', end_date: '2026-12-31' }))
  })

  it('shows the server message and stays open when saving fails', async () => {
    vi.mocked(api.post).mockRejectedValue({ response: { data: { phone: ['Enter a valid Kenyan mobile number, e.g. 0712 345 678.'] } } })
    const onSaved = vi.fn()
    render(<EmployeeFormModal onClose={vi.fn()} onSaved={onSaved} />)
    await userEvent.type(screen.getByLabelText(/^name/i), 'X')
    await userEvent.type(screen.getByLabelText(/phone/i), '123')
    await userEvent.type(screen.getByLabelText(/start date/i), '2026-10-01')
    await userEvent.type(screen.getByLabelText(/monthly salary/i), '1000')
    await userEvent.click(screen.getByRole('button', { name: /save employee/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid Kenyan mobile number')
    expect(onSaved).not.toHaveBeenCalled()
  })
})
