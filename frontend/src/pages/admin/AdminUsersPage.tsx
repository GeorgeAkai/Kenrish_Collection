import { useEffect, useState } from 'react'
import api from '@/lib/axios'
import { formatDate } from '@/lib/utils'
import type { AdminUser, Wishlist } from '@/lib/types'
import InlineConfirm from '@/components/InlineConfirm'

const MAX_ADMINS = 3

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [confirming, setConfirming] = useState<{ id: number; type: 'promote' | 'revoke' | 'delete' } | null>(null)
  const [wishlistModal, setWishlistModal] = useState<{ userId: number; username: string } | null>(null)
  const [wishlistData, setWishlistData] = useState<Wishlist | null>(null)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  const fetchUsers = () => {
    api.get('/admin/users/').then(r => setUsers(r.data.results ?? r.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  async function promote(id: number) {
    setConfirming(null); setActionId(id)
    try { await api.post(`/admin/users/${id}/promote/`); fetchUsers() }
    finally { setActionId(null) }
  }

  async function demote(id: number) {
    setConfirming(null); setActionId(id)
    try {
      await api.post(`/admin/users/${id}/demote/`); fetchUsers()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      if (msg) alert(msg)
    } finally { setActionId(null) }
  }

  async function deleteUser(id: number) {
    setConfirming(null); setActionId(id)
    try {
      await api.delete(`/admin/users/${id}/delete/`); fetchUsers()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      if (msg) alert(msg)
    } finally { setActionId(null) }
  }

  async function openWishlist(userId: number, username: string) {
    setWishlistModal({ userId, username })
    setWishlistData(null)
    setWishlistLoading(true)
    try {
      const { data } = await api.get(`/admin/users/${userId}/wishlist/`)
      setWishlistData(data)
    } catch { /* silent */ }
    finally { setWishlistLoading(false) }
  }

  const adminCount = users.filter(u => u.is_staff).length
  const canPromote = adminCount < MAX_ADMINS

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Users ({users.length})</h2>
        <span className="text-xs text-muted-foreground border rounded-full px-2.5 py-1">{adminCount}/{MAX_ADMINS} admins</span>
      </div>

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
              {u.last_login && <span>Last seen {formatDate(u.last_login)}</span>}
              {u.added_by && <span>via {u.added_by}</span>}
            </div>
            {confirming?.id === u.id ? (
              <InlineConfirm
                label={confirming.type === 'revoke' ? 'Revoke Admin' : confirming.type === 'delete' ? 'Delete User' : 'Make Admin'}
                onConfirm={() => confirming.type === 'revoke' ? demote(u.id) : confirming.type === 'delete' ? deleteUser(u.id) : promote(u.id)}
                onCancel={() => setConfirming(null)}
                loading={actionId === u.id}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {u.has_wishlist && (
                  <button onClick={() => openWishlist(u.id, u.username)}
                    className="text-xs px-3 py-2 border rounded-lg hover:bg-muted transition-colors">
                    Wishlist
                  </button>
                )}
                {u.is_staff ? (
                  <button onClick={() => setConfirming({ id: u.id, type: 'revoke' })} disabled={actionId === u.id}
                    className="text-xs px-3 py-2 border rounded-lg text-orange-600 hover:bg-orange-50 disabled:opacity-50 transition-colors">
                    Revoke Admin
                  </button>
                ) : canPromote ? (
                  <button onClick={() => setConfirming({ id: u.id, type: 'promote' })} disabled={actionId === u.id}
                    className="text-xs px-3 py-2 border rounded-lg text-purple-600 hover:bg-purple-50 disabled:opacity-50 transition-colors">
                    Make Admin
                  </button>
                ) : null}
                <button onClick={() => setConfirming({ id: u.id, type: 'delete' })} disabled={actionId === u.id}
                  className="text-xs px-3 py-2 border rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors ml-auto">
                  Delete
                </button>
              </div>
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
              <th className="text-left px-4 py-3 font-medium">Last Login</th>
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
                <td className="px-4 py-3 text-muted-foreground">{u.last_login ? formatDate(u.last_login) : '—'}</td>
                <td className="px-4 py-3">{u.login_count}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.added_by || '—'}</td>
                <td className="px-4 py-3">
                  {confirming?.id === u.id ? (
                    <InlineConfirm
                      label={confirming.type === 'revoke' ? 'Revoke Admin' : confirming.type === 'delete' ? 'Delete User' : 'Make Admin'}
                      onConfirm={() => confirming.type === 'revoke' ? demote(u.id) : confirming.type === 'delete' ? deleteUser(u.id) : promote(u.id)}
                      onCancel={() => setConfirming(null)}
                      loading={actionId === u.id}
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 justify-end">
                      {u.has_wishlist && (
                        <button onClick={() => openWishlist(u.id, u.username)}
                          className="text-xs px-2.5 py-1.5 border rounded hover:bg-muted transition-colors">
                          Wishlist
                        </button>
                      )}
                      {u.is_staff ? (
                        <button onClick={() => setConfirming({ id: u.id, type: 'revoke' })} disabled={actionId === u.id}
                          className="text-xs px-2.5 py-1.5 border rounded text-orange-600 hover:bg-orange-50 disabled:opacity-50">
                          Revoke Admin
                        </button>
                      ) : canPromote ? (
                        <button onClick={() => setConfirming({ id: u.id, type: 'promote' })} disabled={actionId === u.id}
                          className="text-xs px-2.5 py-1.5 border rounded text-purple-600 hover:bg-purple-50 disabled:opacity-50">
                          Make Admin
                        </button>
                      ) : null}
                      <button onClick={() => setConfirming({ id: u.id, type: 'delete' })} disabled={actionId === u.id}
                        className="text-xs px-2.5 py-1.5 border rounded text-red-500 hover:bg-red-50 disabled:opacity-50">
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Wishlist modal */}
      {wishlistModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setWishlistModal(null)}>
          <div className="bg-background border rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-background">
              <h3 className="font-semibold">{wishlistModal.username}'s Wishlist</h3>
              <button onClick={() => setWishlistModal(null)}
                className="text-muted-foreground hover:text-foreground transition-colors w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted">✕</button>
            </div>
            <div className="p-5 space-y-5">
              {wishlistLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading…</p>
              ) : !wishlistData ? (
                <p className="text-center text-muted-foreground py-8">Failed to load wishlist.</p>
              ) : (
                <>
                  {(['products', 'handbags', 'clothes'] as const).map(key => {
                    const items = wishlistData[key]
                    if (!items.length) return null
                    const label = key === 'products' ? 'Beauty Products' : key === 'handbags' ? 'Handbags' : 'Clothes'
                    return (
                      <div key={key}>
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">{label}</p>
                        <div className="space-y-1.5">
                          {items.map(item => (
                            <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                              {item.image && (
                                <img src={item.image} alt={item.name}
                                  className="w-10 h-10 rounded-lg object-cover shrink-0 bg-muted" />
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground">Ksh {Number(item.price).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {!wishlistData.products.length && !wishlistData.handbags.length && !wishlistData.clothes.length && (
                    <p className="text-center text-muted-foreground py-8 text-sm">Wishlist is empty.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
