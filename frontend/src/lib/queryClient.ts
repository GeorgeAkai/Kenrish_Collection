import { QueryClient } from '@tanstack/react-query'

/**
 * Admin pages keep what they fetched, so stepping to another page and back shows the page at once instead of a
 * spinner, and refreshes quietly behind it only when the data has gone stale.
 *
 * - Data counts as fresh for 30 seconds, and is kept for 30 minutes after you leave the page.
 * - Switching back to the browser tab does not refetch (the old behaviour re-ran every page on return).
 * - After anything is saved, call `useInvalidateAdmin()`: pages on screen refresh now, the rest on next visit.
 *
 * Kept free of any API import so the test setup can reset the cache without loading the real HTTP client.
 */
export function createAppQueryClient(overrides: { retry?: number | boolean } = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
        ...overrides,
      },
    },
  })
}

/** The app's one client, provided in App.tsx. */
export const appQueryClient = createAppQueryClient()

// Used only when a component is rendered with no provider above it (unit tests): no retries, so failures show at once.
export const fallbackQueryClient = createAppQueryClient({ retry: false })
export const resetFallbackQueryClient = () => fallbackQueryClient.clear()
