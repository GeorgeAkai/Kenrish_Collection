import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import { useAdminQuery, useInvalidateAdmin } from './adminQuery'
import { createAppQueryClient } from './queryClient'

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn() } }))

function Names({ url = '/admin/things/', params, staleTime }: { url?: string; params?: Record<string, string>; staleTime?: number }) {
  const q = useAdminQuery<{ name: string }[]>(url, { params, staleTime })
  if (q.isPending) return <p>Loading…</p>
  if (q.isError) return <p role="alert">Failed</p>
  return <ul>{q.data.map(t => <li key={t.name}>{t.name}</li>)}{q.isFetching && <li>refreshing</li>}</ul>
}

function Toggle({ staleTime }: { staleTime?: number }) {
  const [shown, setShown] = useState(true)
  return <><button onClick={() => setShown(s => !s)}>toggle</button>{shown && <Names staleTime={staleTime} />}</>
}

function Saver() {
  const invalidate = useInvalidateAdmin()
  return <button onClick={() => invalidate()}>saved</button>
}

const things = (...names: string[]) => ({ data: names.map(name => ({ name })) })

beforeEach(() => {
  vi.mocked(api.get).mockReset().mockResolvedValue(things('Serum'))
})

describe('useAdminQuery', () => {
  it('fetches the url and returns the data', async () => {
    render(<Names />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByText('Serum')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledTimes(1)
  })

  it('sends params only when there are some', async () => {
    const { unmount } = render(<Names />)
    await screen.findByText('Serum')
    expect(api.get).toHaveBeenCalledWith('/admin/things/')
    unmount()

    render(<Names params={{ shop: 'beauty' }} />)
    await screen.findByText('Serum')
    expect(api.get).toHaveBeenLastCalledWith('/admin/things/', { params: { shop: 'beauty' } })
  })

  it('shows what it already has the moment you come back, without asking the server again', async () => {
    render(<Toggle />)
    await screen.findByText('Serum')
    await userEvent.click(screen.getByText('toggle'))   // step away
    expect(screen.queryByText('Serum')).not.toBeInTheDocument()
    await userEvent.click(screen.getByText('toggle'))   // come back
    expect(screen.getByText('Serum')).toBeInTheDocument()   // instantly, no "Loading…"
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
    expect(api.get).toHaveBeenCalledTimes(1)
  })

  it('once the data is stale, shows it straight away and quietly refreshes behind it', async () => {
    render(<Toggle staleTime={0} />)
    await screen.findByText('Serum')
    await userEvent.click(screen.getByText('toggle'))
    vi.mocked(api.get).mockResolvedValue(things('Serum', 'Lotion'))
    await userEvent.click(screen.getByText('toggle'))
    expect(screen.getByText('Serum')).toBeInTheDocument()            // old data, immediately
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
    expect(await screen.findByText('Lotion')).toBeInTheDocument()    // then the fresh data
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('keeps separate data for different filters', async () => {
    vi.mocked(api.get).mockImplementation(async (_url: string, config?: { params?: { shop?: string } }) =>
      things(config?.params?.shop === 'fashion' ? 'Jacket' : 'Serum'))
    const { rerender } = render(<Names params={{ shop: 'beauty' }} />)
    await screen.findByText('Serum')
    rerender(<Names params={{ shop: 'fashion' }} />)
    expect(await screen.findByText('Jacket')).toBeInTheDocument()
    rerender(<Names params={{ shop: 'beauty' }} />)
    expect(screen.getByText('Serum')).toBeInTheDocument()   // cached, not refetched
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('does not refetch just because you switched back to the browser tab', async () => {
    render(<Names />)
    await screen.findByText('Serum')
    act(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')) })
    await new Promise(r => setTimeout(r, 30))
    expect(api.get).toHaveBeenCalledTimes(1)
  })

  it('reports a failure instead of retrying forever in the background', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('offline'))
    render(<Names />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('works inside an explicit QueryClientProvider too (the real app)', async () => {
    render(<QueryClientProvider client={createAppQueryClient()}><Names /></QueryClientProvider>)
    expect(await screen.findByText('Serum')).toBeInTheDocument()
  })
})

describe('useInvalidateAdmin', () => {
  it('refreshes what is on screen after something is saved', async () => {
    render(<><Saver /><Names /></>)
    await screen.findByText('Serum')
    vi.mocked(api.get).mockResolvedValue(things('Serum', 'Lotion'))
    await userEvent.click(screen.getByText('saved'))
    expect(await screen.findByText('Lotion')).toBeInTheDocument()
  })

  it('marks pages you are not on as stale, so they refresh when you next open them', async () => {
    function App() {
      const [page, setPage] = useState<'a' | 'b'>('a')
      return <><Saver /><button onClick={() => setPage(p => (p === 'a' ? 'b' : 'a'))}>switch</button>
        {page === 'a' ? <Names url="/admin/a/" /> : <Names url="/admin/b/" />}</>
    }
    vi.mocked(api.get).mockImplementation(async (url: string) => things(url.includes('/a/') ? 'A1' : 'B1'))
    render(<App />)
    await screen.findByText('A1')
    await userEvent.click(screen.getByText('switch'))
    await screen.findByText('B1')
    await userEvent.click(screen.getByText('switch'))           // back on A (cached)
    await screen.findByText('A1')
    const before = vi.mocked(api.get).mock.calls.length

    await userEvent.click(screen.getByText('switch'))           // on B
    await userEvent.click(screen.getByText('saved'))            // a save happens while looking at B
    vi.mocked(api.get).mockImplementation(async (url: string) => things(url.includes('/a/') ? 'A2' : 'B2'))
    await userEvent.click(screen.getByText('switch'))           // back on A: no spinner, then A2
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()   // old data (or already the new), never a blank page
    expect(await screen.findByText('A2')).toBeInTheDocument()
    expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(before)
    await waitFor(() => expect(screen.queryByText('refreshing')).not.toBeInTheDocument())
  })
})
