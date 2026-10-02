import { useCallback, useContext } from 'react'
import { QueryClientContext, useQuery, type UseQueryResult } from '@tanstack/react-query'
import api from '@/lib/axios'
import { fallbackQueryClient } from '@/lib/queryClient'

const useAdminClient = () => useContext(QueryClientContext) ?? fallbackQueryClient

interface Options<TRaw, T> {
  params?: Record<string, string | number | boolean | undefined>
  /** Reshape the response (e.g. unwrap `results`). Runs on every read, so keep it cheap. */
  select?: (raw: TRaw) => T
  enabled?: boolean
  staleTime?: number
}

/** GET an admin endpoint. The cache entry is keyed by url + params, so each filter has its own data. */
export function useAdminQuery<TRaw, T = TRaw>(url: string, options: Options<TRaw, T> = {}): UseQueryResult<T> {
  const { params, select, enabled, staleTime } = options
  return useQuery<TRaw, Error, T>({
    queryKey: ['admin', url, params ?? null],
    queryFn: async () => (await (params ? api.get<TRaw>(url, { params }) : api.get<TRaw>(url))).data,
    // Only pass what was set: an explicit `undefined` would override the client's defaults (e.g. staleTime -> 0).
    ...(select && { select }),
    ...(enabled !== undefined && { enabled }),
    ...(staleTime !== undefined && { staleTime }),
  }, useAdminClient())
}

/** Call after a save: refreshes every admin page currently on screen and marks the rest stale. */
export function useInvalidateAdmin() {
  const client = useAdminClient()
  return useCallback(() => client.invalidateQueries({ queryKey: ['admin'] }), [client])
}
