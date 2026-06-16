import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, X, Star } from 'lucide-react'
import api from '@/lib/axios'
import { formatKES } from '@/lib/utils'
import InlineConfirm from '@/components/InlineConfirm'
import { useConfirm } from '@/hooks/useConfirm'
import FileDropZone from '@/components/admin/FileDropZone'

interface Item {
  id: number
  name: string
  price: string
  cost_price?: string
  description: string
  stock_quantity: number
  reorder_level: number
  image: string | null
  average_rating?: number
  is_published?: boolean
  [key: string]: unknown
}

interface Field {
  name: string
  label: string
  type?: 'text' | 'number' | 'textarea'
  required?: boolean
}

interface Props {
  title: string
  endpoint: string
  extraFields?: Field[]
}

const baseFields: Field[] = [
  { name: 'name', label: 'Name', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'price', label: 'Price (KES)', type: 'number', required: true },
  { name: 'cost_price', label: 'Cost Price (KES)', type: 'number' },
  { name: 'stock_quantity', label: 'Stock Quantity', type: 'number' },
  { name: 'reorder_level', label: 'Reorder Level', type: 'number' },
]

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      published
        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${published ? 'bg-green-500' : 'bg-amber-500'}`} />
      {published ? 'Published' : 'Draft'}
    </span>
  )
}

export default function CatalogueAdmin({ title, endpoint, extraFields = [] }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Item | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [isPublished, setIsPublished] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const del = useConfirm<number>()

  const allFields = [...baseFields, ...extraFields]

  const fetch = () => {
    api.get(`${endpoint}/`).then(r => {
      setItems(Array.isArray(r.data) ? r.data : (r.data.results ?? []))
    }).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [endpoint])

  function openCreate() {
    setEditing(null)
    setForm({})
    setIsPublished(true)
    setImageFile(null)
    setError('')
    setShowForm(true)
  }

  function openEdit(item: Item) {
    setEditing(item)
    const f: Record<string, string> = {}
    allFields.forEach(field => { f[field.name] = String(item[field.name] ?? '') })
    setForm(f)
    setIsPublished(item.is_published !== false)
    setImageFile(null)
    setError('')
    setShowForm(true)
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    del.cancel()
    try {
      await api.delete(`${endpoint}/${id}/`)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch {
      // silently ignore; item stays in list
    } finally {
      setDeletingId(null)
    }
  }

  async function handleTogglePublished(item: Item) {
    const newVal = !item.is_published
    setTogglingId(item.id)
    try {
      await api.patch(`${endpoint}/${item.id}/`, { is_published: newVal })
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_published: newVal } : i))
    } catch {
      // silently ignore
    } finally {
      setTogglingId(null)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      allFields.forEach(f => { if (form[f.name]) fd.append(f.name, form[f.name]) })
      fd.append('is_published', String(isPublished))
      if (imageFile) fd.append('image', imageFile)
      const headers = { 'Content-Type': 'multipart/form-data' }
      if (editing) {
        await api.patch(`${endpoint}/${editing.id}/`, fd, { headers })
      } else {
        await api.post(`${endpoint}/`, fd, { headers })
      }
      setShowForm(false)
      fetch()
    } catch (err: unknown) {
      const response = (err as { response?: { data?: unknown } }).response
      const data = response?.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const msgs = Object.entries(data as Record<string, unknown>)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
          .join('; ')
        setError(msgs)
      } else {
        setError('Save failed. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  const stockClass = (item: Item) =>
    item.stock_quantity === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
    : item.stock_quantity <= item.reorder_level ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
    : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{items.length} items</p>
        </div>
        <button
          onClick={openCreate}
          className="btn-modern btn-modern--primary flex items-center gap-2 text-sm font-medium"
        >
          <Plus size={16} /> Add New
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Price</th>
                  <th className="text-left px-4 py-3 font-medium">Stock</th>
                  <th className="text-left px-4 py-3 font-medium">Rating</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img src={item.image} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                        )}
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatKES(item.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stockClass(item)}`}>
                        {item.stock_quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(item.average_rating ?? 0) > 0 ? (
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-amber-400" fill="currentColor" />
                          <span className="text-muted-foreground">{(item.average_rating as number).toFixed(1)}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleTogglePublished(item)}
                        disabled={togglingId === item.id}
                        className="disabled:opacity-50 transition-opacity"
                        title={item.is_published !== false ? 'Click to unpublish' : 'Click to publish'}
                      >
                        <StatusBadge published={item.is_published !== false} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end items-center gap-2">
                        <button onClick={() => openEdit(item)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors">
                          <Pencil size={13} />
                        </button>
                        {del.isAsking(item.id) ? (
                          <InlineConfirm onConfirm={() => handleDelete(item.id)} onCancel={del.cancel} loading={deletingId === item.id} />
                        ) : (
                          <button onClick={() => del.ask(item.id)} disabled={deletingId === item.id}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No items yet. Add your first one!</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {items.map(item => (
              <div key={item.id} className="product-card p-4">
                <div className="flex gap-3 items-start">
                  {item.image && <div className="w-16 h-16 rounded-xl overflow-hidden"><img src={item.image} alt="" className="w-full h-full object-cover" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="product-title font-semibold truncate">{item.name}</p>
                    <p className="product-price font-medium text-sm mt-0.5">{formatKES(item.price)}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stockClass(item)}`}>
                        {item.stock_quantity} in stock
                      </span>
                      <button
                        onClick={() => handleTogglePublished(item)}
                        disabled={togglingId === item.id}
                        className="disabled:opacity-50"
                      >
                        <StatusBadge published={item.is_published !== false} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0 items-end">
                    <button onClick={() => openEdit(item)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors">
                      <Pencil size={13} />
                    </button>
                    {del.isAsking(item.id) ? (
                      <InlineConfirm onConfirm={() => handleDelete(item.id)} onCancel={del.cancel} loading={deletingId === item.id} />
                    ) : (
                      <button onClick={() => del.ask(item.id)} disabled={deletingId === item.id}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">No items yet. Add your first one!</div>
            )}
          </div>
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-background rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-background">
              <h3 className="text-lg font-bold">{editing ? 'Edit' : 'Add'} {title.replace(/s$/, '')}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {allFields.map(f => (
                <div key={f.name}>
                  <label className="block text-sm font-medium mb-1.5">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea
                      className="input-field min-h-[80px]"
                      value={form[f.name] ?? ''}
                      onChange={e => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                      required={f.required}
                    />
                  ) : (
                    <input
                      type={f.type ?? 'text'}
                      className="input-field"
                      value={form[f.name] ?? ''}
                      onChange={e => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                      required={f.required}
                      step={f.type === 'number' ? 'any' : undefined}
                    />
                  )}
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-1.5">Image</label>
                <FileDropZone
                  file={imageFile}
                  onFileChange={setImageFile}
                  currentUrl={editing?.image ?? null}
                />
              </div>

              {/* Published toggle */}
              <div className="flex items-center justify-between rounded-xl border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Published</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isPublished ? 'Visible to customers' : 'Hidden — saved as draft'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublished(p => !p)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${isPublished ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-2 pb-2">
                <button type="submit" disabled={saving}
                    className="btn-modern btn-modern--primary flex-1 text-sm font-semibold">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                    className="btn-modern btn-modern--secondary flex-1 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
