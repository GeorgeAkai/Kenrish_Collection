import { useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import api from '@/lib/axios'
import { useAdminQuery, useInvalidateAdmin } from '@/lib/adminQuery'
import InlineConfirm from '@/components/InlineConfirm'
import { useConfirm } from '@/hooks/useConfirm'
import { useToast } from '@/contexts/ToastContext'

interface Category { id: number; name: string; slug: string; sort_order: number; item_count: number }

function errorText(err: unknown, fallback: string) {
  const data = (err as { response?: { data?: { detail?: string; name?: string[] } } }).response?.data
  return data?.detail ?? data?.name?.[0] ?? fallback
}

/** Manage the Fashion clothes categories (Men, Women, Kids, ...). */
export default function AdminClothesCategoriesPage() {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const del = useConfirm<number>()
  const toast = useToast()

  const list = useAdminQuery<Category[]>('/admin/clothes-categories/')
  const cats = list.data ?? []
  const loading = list.isPending
  const load = useInvalidateAdmin()

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    try {
      await api.post('/admin/clothes-categories/', { name: newName.trim(), sort_order: cats.length })
      setNewName('')
      toast.success('Category added.')
      load()
    } catch (err) {
      toast.error(errorText(err, 'Could not add category.'))
    } finally {
      setAdding(false)
    }
  }

  async function handleRename(id: number) {
    if (!editName.trim()) return
    setBusyId(id)
    try {
      await api.patch(`/admin/clothes-categories/${id}/`, { name: editName.trim() })
      setEditingId(null)
      toast.success('Category renamed.')
      load()
    } catch (err) {
      toast.error(errorText(err, 'Could not rename category.'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(id: number) {
    setBusyId(id)
    del.cancel()
    try {
      await api.delete(`/admin/clothes-categories/${id}/`)
      toast.success('Category deleted.')
      load()
    } catch (err) {
      toast.error(errorText(err, 'Could not delete category.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Clothes Categories</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          The groups shoppers can filter Kenrish Fashion clothes by. A category can only be deleted once it has no clothes in it.
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mb-5">
        <label className="sr-only" htmlFor="new-cat">New category name</label>
        <input id="new-cat" className="input-field flex-1" placeholder="New category, e.g. Teens" value={newName}
          onChange={e => setNewName(e.target.value)} maxLength={100} />
        <button type="submit" disabled={adding || !newName.trim()}
          className="btn-modern btn-modern--primary flex items-center gap-2 text-sm font-medium disabled:opacity-50">
          <Plus size={16} /> Add
        </button>
      </form>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : cats.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-2xl">No categories yet.</div>
      ) : (
        <ul className="border rounded-2xl divide-y overflow-hidden bg-card">
          {cats.map(c => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              {editingId === c.id ? (
                <>
                  <input className="input-field flex-1" value={editName} autoFocus maxLength={100}
                    aria-label={`Rename ${c.name}`}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(c.id); if (e.key === 'Escape') setEditingId(null) }} />
                  <button onClick={() => handleRename(c.id)} disabled={busyId === c.id} aria-label="Save name"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-muted"><Check size={14} /></button>
                  <button onClick={() => setEditingId(null)} aria-label="Cancel rename"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-muted"><X size={14} /></button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.item_count} item{c.item_count === 1 ? '' : 's'}</p>
                  </div>
                  <button onClick={() => { setEditingId(c.id); setEditName(c.name) }} aria-label={`Rename ${c.name}`}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors"><Pencil size={13} /></button>
                  {del.isAsking(c.id) ? (
                    <InlineConfirm onConfirm={() => handleDelete(c.id)} onCancel={del.cancel} loading={busyId === c.id} />
                  ) : (
                    <button onClick={() => del.ask(c.id)} aria-label={`Delete ${c.name}`}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={13} /></button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
