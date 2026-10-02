import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import { AuthProvider } from '@/contexts/AuthContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ToastProvider } from '@/contexts/ToastContext'
import FashionPage from './FashionPage'

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const jacket = { id: 1, name: 'Denim Jacket', price: '1200.00', image: null, average_rating: 0, stock_quantity: 3, category: 1, category_name: 'Men', category_slug: 'men' }

beforeEach(() => {
  vi.mocked(api.get).mockReset().mockImplementation(async (url: string) => {
    if (url.startsWith('/handbags/')) return { data: { results: [] } }
    if (url.startsWith('/clothes/categories')) return { data: [{ id: 1, name: 'Men', slug: 'men' }] }
    if (url.startsWith('/clothes/')) return { data: { results: [jacket] } }
    return { data: [] }
  })
})

describe('FashionPage grid', () => {
  it('shows one product per row on a phone, then more as the screen widens', async () => {
    render(<MemoryRouter><LanguageProvider><ToastProvider><AuthProvider><FashionPage /></AuthProvider></ToastProvider></LanguageProvider></MemoryRouter>)
    const grid = (await screen.findByText('Denim Jacket')).closest('.grid')!
    expect(grid).toHaveClass('grid-cols-1')
    expect(grid).not.toHaveClass('grid-cols-2')
    expect(grid).toHaveClass('sm:grid-cols-3', 'lg:grid-cols-4')
  })
})
