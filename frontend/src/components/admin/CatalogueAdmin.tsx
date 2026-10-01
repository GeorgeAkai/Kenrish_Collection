import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, X, Star, FolderInput } from 'lucide-react'
import api from '@/lib/axios'
import { formatKES } from '@/lib/utils'
import InlineConfirm from '@/components/InlineConfirm'
import { useConfirm } from '@/hooks/useConfirm'
import FileDropZone from '@/components/admin/FileDropZone'
import { useToast } from '@/contexts/ToastContext'

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

type CategoryType = 'product' | 'handbag' | 'clothes'

interface Props {
  title: string
  endpoint: string
  /** Category this admin page manages, enables moving items to other categories. */
  itemType?: CategoryType
  extraFields?: Field[]
  /** Clothes only: show a category picker and column (Men / Women / Kids / ...). */
  withCategories?: boolean
}

const CATEGORY_LABELS: Record<CategoryType, string> = {
  product: 'Products',
  handbag: 'Handbags',
  clothes: 'Clothes',
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

interface CategoryOption { id: number; name: string }

export default function CatalogueAdmin({ title, endpoint, itemType, extraFields = [], withCategories }: Props) {
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
  const [moving, setMoving] = useState<Item | null>(null)
  const [moveTarget, setMoveTarget] = useState<CategoryType | null>(null)
  const [moveLoading, setMoveLoading] = useState(false)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const del = useConfirm<number>()
  const toast = useToast()

  const allFields = [...baseFields, ...extraFields]

  const moveTargets: CategoryType[] = itemType
    ? (['product', 'handbag', 'clothes'] as CategoryType[]).filter(t => t !== itemType)
    : []

  const fetch = () => {
    api.get(`${endpoint}/`).then(r => {
      setItems(Array.isArray(r.data) ? r.data : (r.data.results ?? []))
    }).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [endpoint])
  useEffect(() => {
    if (!withCategories) return
    api.get<CategoryOption[]>('/admin/clothes-categories/').then(r => setCategories(r.data)).catch(console.error)
  }, [withCategories])

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
    if (withCategories) f.category = item.category ? String(item.category) : ''
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

  function openMove(item: Item) {
    setMoving(item)
    setMoveTarget(moveTargets[0] ?? null)
  }

  async function handleMove() {
    if (!moving || !itemType || !moveTarget) return
    setMoveLoading(true)
    try {
      await api.post(`/admin/catalogue/${itemType}/${moving.id}/move/`, { target_type: moveTarget })
      setItems(prev => prev.filter(i => i.id !== moving.id))
      toast.success(`"${moving.name}" moved to ${CATEGORY_LABELS[moveTarget]}.`)
      setMoving(null)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      toast.error(detail || 'Move failed. Please try again.')
    } finally {
      setMoveLoading(false)
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
      if (withCategories) fd.append('category', form.category ?? '')
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
                  {withCategories && <th className="text-left px-4 py-3 font-medium">Category</th>}
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
                    {withCategories && (
                      <td className="px-4 py-3 text-muted-foreground">{(item.category_name as string | null) ?? 'Uncategorised'}</td>
                    )}
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
                      ) : '-'}
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
                        {moveTargets.length > 0 && (
                          <button onClick={() => openMove(item)} title="Move to another category"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors">
                            <FolderInput size={13} />
                          </button>
                        )}
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
                  <tr><td colSpan={withCategories ? 7 : 6} className="px-4 py-12 text-center text-muted-foreground">No items yet. Add your first one!</td></tr>
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
                    {withCategories && (
                      <p className="text-xs text-muted-foreground">{(item.category_name as string | null) ?? 'Uncategorised'}</p>
                    )}
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
                    {moveTargets.length > 0 && (
                      <button onClick={() => openMove(item)} title="Move to another category"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors">
                        <FolderInput size={13} />
                      </button>
                    )}
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
                  <label className="block text-sm font-medium mb-1.5">{f.label}{f.required ? <> <span className="text-danger" aria-hidden="true">*</span></> : <> <span className="font-normal text-muted-foreground">(optional)</span></>}</label>
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
              {withCategories && (
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="cat-category">Category <span className="font-normal text-muted-foreground">(optional)</span></label>
                  <select id="cat-category" className="input-field" value={form.category ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}>
                    <option value="">Uncategorised</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">Image <span className="font-normal text-muted-foreground">(optional)</span></label>
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
                    {isPublished ? 'Visible to customers' : 'Hidden, saved as draft'}
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

      {/* Move Modal */}
      {moving && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-background rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold">Move item</h3>
              <button onClick={() => setMoving(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Move <span className="font-semibold text-foreground">{moving.name}</span> to another
                category. Its name, price, stock and image are kept; ratings and sales history are not
                carried over.
              </p>
              <div className="space-y-2">
                {moveTargets.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMoveTarget(t)}
                    className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                      moveTarget === t ? 'border-primary bg-primary/10' : 'hover:bg-muted'
                    }`}
                  >
                    <span>{CATEGORY_LABELS[t]}</span>
                    <span className={`w-4 h-4 rounded-full border-2 ${moveTarget === t ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`} />
                  </button>
                ))}
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={handleMove} disabled={moveLoading || !moveTarget}
                    className="btn-modern btn-modern--primary flex-1 text-sm font-semibold disabled:opacity-50">
                  {moveLoading ? 'Moving…' : 'Move'}
                </button>
                <button onClick={() => setMoving(null)}
                    className="btn-modern btn-modern--secondary flex-1 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
