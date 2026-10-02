import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import AdminStagingPage from './AdminStagingPage'

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))

beforeEach(() => {
  vi.mocked(api.get).mockReset().mockResolvedValue({ data: [] })
})

describe('AdminStagingPage links back to inventory', () => {
  it('stays inside the shop it belongs to', async () => {
    render(<MemoryRouter><AdminStagingPage shop="fashion" /></MemoryRouter>)
    await screen.findByText(/no draft products/i)
    expect(screen.getByRole('link', { name: /← inventory/i })).toHaveAttribute('href', '/admin/fashion/inventory')
    expect(screen.getByRole('link', { name: /go to inventory/i })).toHaveAttribute('href', '/admin/fashion/inventory')
  })

  it('goes to the general inventory when no shop is set', async () => {
    render(<MemoryRouter><AdminStagingPage /></MemoryRouter>)
    await screen.findByText(/no draft products/i)
    expect(screen.getByRole('link', { name: /← inventory/i })).toHaveAttribute('href', '/admin/inventory')
  })
})
