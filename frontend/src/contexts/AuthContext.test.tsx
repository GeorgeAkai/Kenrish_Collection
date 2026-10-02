import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { appQueryClient } from '@/lib/queryClient'
import { AuthProvider, useAuth } from './AuthContext'

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>
const admin = { id: 1, username: 'admin', email: 'a@example.com', is_staff: true }

beforeEach(() => {
  localStorage.clear()
  appQueryClient.clear()
})

describe('AuthProvider and the admin data cache', () => {
  it('forgets everything cached for the admin when they log out', () => {
    appQueryClient.setQueryData(['admin', '/admin/customers/', null], [{ name: 'Mary' }])
    const { result } = renderHook(() => useAuth(), { wrapper })
    act(() => result.current.login(admin, 'a', 'r'))
    appQueryClient.setQueryData(['admin', '/admin/customers/', null], [{ name: 'Mary' }])

    act(() => result.current.logout())

    expect(appQueryClient.getQueryData(['admin', '/admin/customers/', null])).toBeUndefined()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('starts from a clean cache when someone logs in, so one person never sees another\'s data', () => {
    appQueryClient.setQueryData(['admin', '/admin/employees/', null], [{ name: 'Wanjiru', monthly_salary: '18000' }])
    const { result } = renderHook(() => useAuth(), { wrapper })
    act(() => result.current.login(admin, 'a', 'r'))
    expect(appQueryClient.getQueryData(['admin', '/admin/employees/', null])).toBeUndefined()
    expect(result.current.isAuthenticated).toBe(true)
  })
})
