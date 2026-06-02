import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export interface User {
  id: number
  username: string
  email: string
  is_staff: boolean
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  login: (user: User, access: string, refresh: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function restoreUser(): User | null {
  try {
    const raw = localStorage.getItem('user')
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(restoreUser)

  const login = (user: User, access: string, refresh: string) => {
    setUser(user)
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('access', access)
    localStorage.setItem('refresh', refresh)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
