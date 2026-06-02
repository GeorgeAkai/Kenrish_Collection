import { useEffect, useState } from 'react'
import api from '@/lib/axios'
import { formatDate } from '@/lib/utils'
import type { AdminUser } from '@/lib/types'
import InlineConfirm from '@/components/InlineConfirm'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [confirming, setConfirming] = useState<{ id: number; type: 'promote' | 'revoke' } | null>(null)

  const fetch = () => {
    api.get('/admin/users/').then(r => setUsers(r.data.results ?? r.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  async function promote(id: number) {
    setConfirming(null)
    setActionId(id)
    try {
      await api.post(`/admin/users/${id}/promote/`)
      fetch()
    } finally {
      setActionId(null)
    }
  }

  async function demote(id: number) {
    setConfirming(null)
    setActionId(id)
    try {
      await api.post(`/admin/users/${id}/demote/`)
      fetch()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      if (msg) alert(msg)
    } finally {
      setActionId(null)
    }
  }

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading…</div>

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Users ({users.length})</h2>
      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {users.length === 0 && <p className="py-10 text-center text-muted-foreground text-sm">No users found.</p>}
        {users.map(u => (
          <div key={u.id} className="border border-border rounded-xl p-4 space-y-2.5 bg-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{u.username}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${u.is_staff ? 'bg-purple-100 text-purple-700' : 'bg-zinc-100 text-zinc-600'}`}>
                {u.is_staff ? 'Admin' : 'Customer'}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Joined {formatDate(u.date_joined)}</span>
              <span>{u.login_count} login{u.login_count !== 1 ? 's' : ''}</span>
              {u.added_by && <span>via {u.added_by}</span>}
            </div>
            {confirming?.id === u.id ? (
              <InlineConfirm
                label={confirming.type === 'revoke' ? 'Revoke Admin' : 'Make Admin'}
                onConfirm={() => confirming.type === 'revoke' ? demote(u.id) : promote(u.id)}
                onCancel={() => setConfirming(null)}
                loading={actionId === u.id}
              />
            ) : u.is_staff ? (
              <button onClick={() => setConfirming({ id: u.id, type: 'revoke' })} disabled={actionId === u.id}
                className="w-full text-xs px-3 py-2 border rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors">
                Revoke Admin
              </button>
            ) : (
              <button onClick={() => setConfirming({ id: u.id, type: 'promote' })} disabled={actionId === u.id}
                className="w-full text-xs px-3 py-2 border rounded-lg text-purple-600 hover:bg-purple-50 disabled:opacity-50 transition-colors">
                Make Admin
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Username</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Joined</th>
              <th className="text-left px-4 py-3 font-medium">Logins</th>
              <th className="text-left px-4 py-3 font-medium">Added By</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{u.username}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_staff ? 'bg-purple-100 text-purple-700' : 'bg-zinc-100 text-zinc-600'}`}>
                    {u.is_staff ? 'Admin' : 'Customer'}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(u.date_joined)}</td>
                <td className="px-4 py-3">{u.login_count}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.added_by || '—'}</td>
                <td className="px-4 py-3 text-right">
                  {confirming?.id === u.id ? (
                    <InlineConfirm
                      label={confirming.type === 'revoke' ? 'Revoke Admin' : 'Make Admin'}
                      onConfirm={() => confirming.type === 'revoke' ? demote(u.id) : promote(u.id)}
                      onCancel={() => setConfirming(null)}
                      loading={actionId === u.id}
                    />
                  ) : u.is_staff ? (
                    <button onClick={() => setConfirming({ id: u.id, type: 'revoke' })} disabled={actionId === u.id}
                      className="text-xs px-3 py-1.5 border rounded text-red-500 hover:bg-red-50 disabled:opacity-50">
                      Revoke Admin
                    </button>
                  ) : (
                    <button onClick={() => setConfirming({ id: u.id, type: 'promote' })} disabled={actionId === u.id}
                      className="text-xs px-3 py-1.5 border rounded text-purple-600 hover:bg-purple-50 disabled:opacity-50">
                      Make Admin
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No users found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
