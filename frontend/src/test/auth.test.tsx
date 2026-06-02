import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { AdminRoute, ProtectedRoute } from '@/components/RouteGuards'

// Minimal consumer components for testing context behaviour
function LoginStatus() {
  const { user, isAuthenticated } = useAuth()
  return (
    <div>
      <span data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="staff">{user?.is_staff ? 'admin' : 'user'}</span>
    </div>
  )
}

function LoginButton() {
  const { login, logout } = useAuth()
  return (
    <>
      <button
        onClick={() => login({ id: 1, username: 'george', email: 'g@k.ke', is_staff: false }, 'acc', 'ref')}
      >
        login
      </button>
      <button onClick={logout}>logout</button>
    </>
  )
}


function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

// --- Cycle 1: login sets isAuthenticated ---
describe('AuthContext', () => {
  it('starts unauthenticated', () => {
    render(<Wrapper><LoginStatus /></Wrapper>)
    expect(screen.getByTestId('auth')).toHaveTextContent('no')
  })

  it('login() makes isAuthenticated true', async () => {
    render(<Wrapper><LoginStatus /><LoginButton /></Wrapper>)
    await act(async () => {
      screen.getByText('login').click()
    })
    expect(screen.getByTestId('auth')).toHaveTextContent('yes')
  })

  // --- Cycle 2: logout clears user ---
  it('logout() makes isAuthenticated false', async () => {
    render(<Wrapper><LoginStatus /><LoginButton /></Wrapper>)
    await act(async () => { screen.getByText('login').click() })
    await act(async () => { screen.getByText('logout').click() })
    expect(screen.getByTestId('auth')).toHaveTextContent('no')
  })
})

// --- Cycle 3: unauthenticated user redirected to /login ---
describe('ProtectedRoute', () => {
  it('redirects unauthenticated user to /login', () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>login page</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<div>profile</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )
    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('profile')).not.toBeInTheDocument()
  })
})

// --- Cycle 4: non-staff redirected from /admin ---
describe('AdminRoute', () => {
  it('redirects non-staff user away from /admin', async () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<div>home</div>} />
            <Route path="/login" element={<div>login page</div>} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<div>admin panel</div>} />
            </Route>
          </Routes>
          <LoginButton />
        </AuthProvider>
      </MemoryRouter>
    )
    // Login as non-staff first
    await act(async () => { screen.getByText('login').click() })
    expect(screen.queryByText('admin panel')).not.toBeInTheDocument()
  })

  // --- Cycle 5: staff user can access /admin ---
  it('allows staff user to access /admin', () => {
    // Pre-populate localStorage so AuthProvider restores synchronously on first render
    const staffUser = { id: 2, username: 'boss', email: 'boss@k.ke', is_staff: true }
    localStorage.setItem('user', JSON.stringify(staffUser))
    localStorage.setItem('access', 'acc2')
    localStorage.setItem('refresh', 'ref2')

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<div>home</div>} />
            <Route path="/login" element={<div>login page</div>} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<div>admin panel</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )
    expect(screen.getByText('admin panel')).toBeInTheDocument()
  })
})
