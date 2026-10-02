import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import AuditHistoryModal from './AuditHistoryModal'

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn() } }))

beforeEach(() => vi.mocked(api.get).mockReset())

describe('AuditHistoryModal', () => {
  it('asks for the history of one record and shows who changed what, omitting unchanged fields', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{
      id: 2, kind: 'expense', object_ref: 9, object_label: 'Jacket bale', action: 'edit', actor_username: 'akai',
      created_at: '2026-10-02T08:30:00Z',
      before: { description: 'Jacket bale', amount: '45000.00', date_purchased: '2026-09-28' },
      after: { description: 'Jacket bale', amount: '42000.00', date_purchased: '2026-09-28' },
    }] })
    render(<AuditHistoryModal kind="expense" objectRef={9} title="Jacket bale" onClose={vi.fn()} />)

    expect(await screen.findByText(/akai/)).toBeInTheDocument()
    expect(screen.getByText(/Amount: 45000\.00 → 42000\.00/)).toBeInTheDocument()
    expect(screen.queryByText(/Description:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Date purchased:/)).not.toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/admin/audit/', { params: { kind: 'expense', ref: 9 } })
  })

  it('shows a deletion with what was removed', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{
      id: 3, kind: 'expense', object_ref: 9, object_label: 'Jacket bale', action: 'delete', actor_username: 'akai',
      created_at: '2026-10-03T08:30:00Z', before: { description: 'Jacket bale', amount: '45000.00' }, after: null,
    }] })
    render(<AuditHistoryModal kind="expense" objectRef={9} title="Jacket bale" onClose={vi.fn()} />)
    expect(await screen.findByText(/Deleted by akai/)).toBeInTheDocument()
    expect(screen.getByText(/Amount: 45000\.00/)).toBeInTheDocument()
  })

  it('says so when nothing has been changed', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    render(<AuditHistoryModal kind="expense" objectRef={9} title="Jacket bale" onClose={vi.fn()} />)
    expect(await screen.findByText(/no changes recorded/i)).toBeInTheDocument()
  })
})
