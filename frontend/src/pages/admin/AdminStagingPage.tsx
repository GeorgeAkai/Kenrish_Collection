import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImagePlus, Trash2 } from 'lucide-react'
import api from '@/lib/axios'
import { formatKES } from '@/lib/utils'

interface DraftProduct {
  id: number
  item_type: 'product' | 'handbag' | 'clothes'
  name: string
  description: string
  price: string
  cost_price: string
  image: string | null
  stock_quantity: number
}

const PATCH_PATH: Record<string, string> = {
  product: '/admin/products',
  handbag: '/admin/handbags',
  clothes: '/admin/clothes',
}

function DraftCard({
  draft,
  onPublished,
  onDiscarded,
}: {
  draft: DraftProduct
  onPublished: (id: number, type: string) => void
  onDiscarded: (id: number, type: string) => void
}) {
  const [name, setName] = useState(draft.name)
  const [description, setDescription] = useState(draft.description || '')
  const [price, setPrice] = useState(draft.price)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(draft.image)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function pickImage(f: File) {
    setImageFile(f)
    setImagePreview(URL.createObjectURL(f))
    setMsg('')
  }

  async function handleSave() {
    setSaving(true)
    setMsg('')
    try {
      const form = new FormData()
      form.append('name', name)
      form.append('description', description)
      form.append('price', price)
      if (imageFile) form.append('image', imageFile)
      await api.patch(`${PATCH_PATH[draft.item_type]}/${draft.id}/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMsg('Saved')
      setImageFile(null)
    } catch {
      setMsg('Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    setMsg('')
    try {
      await api.patch(`${PATCH_PATH[draft.item_type]}/${draft.id}/`, { name, description, price, is_published: true })
      onPublished(draft.id, draft.item_type)
    } catch {
      setMsg('Publish failed')
      setPublishing(false)
    }
  }

  async function handleDiscard() {
    if (!window.confirm(`Delete draft "${name}"? This cannot be undone.`)) return
    setDiscarding(true)
    try {
      await api.delete(`/admin/staging/${draft.item_type}/${draft.id}/discard/`)
      onDiscarded(draft.id, draft.item_type)
    } catch {
      setMsg('Delete failed')
      setDiscarding(false)
    }
  }

  return (
    <div className="border border-border rounded-2xl bg-card overflow-hidden">
      <div className="flex gap-5 p-5 flex-wrap sm:flex-nowrap">
        {/* Image */}
        <div
          className="shrink-0 w-32 h-32 rounded-xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) pickImage(f) }}
          />
          {imagePreview ? (
            <img src={imagePreview} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-2 pointer-events-none">
              <ImagePlus size={20} className="mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Add image</p>
            </div>
          )}
        </div>

        {/* Fields */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start gap-2 flex-wrap">
            <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
              draft.item_type === 'product' ? 'bg-blue-100 text-blue-700' :
              draft.item_type === 'handbag' ? 'bg-purple-100 text-purple-700' :
              'bg-orange-100 text-orange-700'
            }`}>
              {draft.item_type}
            </span>
            <span className="text-xs text-muted-foreground">
              Stock: {draft.stock_quantity} · Cost: {formatKES(draft.cost_price)}
            </span>
          </div>

          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Product name"
            className="w-full border rounded-lg px-3 py-2 text-sm font-medium bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground shrink-0">Selling price (KES)</label>
            <input
              type="number"
              step="any"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-32 border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-5 pb-5 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="btn-modern btn-modern--primary px-4 py-2 text-sm"
        >
          {publishing ? 'Publishing…' : 'Publish'}
        </button>
        <button
          onClick={handleDiscard}
          disabled={discarding}
          className="ml-auto flex items-center gap-1.5 text-xs text-red-500/70 hover:text-red-600 transition-colors"
        >
          <Trash2 size={13} />
          {discarding ? 'Deleting…' : 'Discard'}
        </button>
        {msg && (
          <span className={`text-xs ml-2 ${msg === 'Saved' ? 'text-green-600' : 'text-red-500'}`}>
            {msg}
          </span>
        )}
      </div>
    </div>
  )
}

export default function AdminStagingPage() {
  const [drafts, setDrafts] = useState<DraftProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/staging/')
      .then(r => setDrafts(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function removeItem(id: number, type: string) {
    setDrafts(prev => prev.filter(d => !(d.id === id && d.item_type === type)))
  }

  if (loading) {
    return <div className="text-center py-16 text-muted-foreground">Loading drafts…</div>
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Draft Products</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Add details and publish when ready — unpublished products are hidden from customers.
          </p>
        </div>
        <Link to="/admin/inventory" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2">
          ← Inventory
        </Link>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center space-y-2">
          <p className="font-medium text-muted-foreground">No draft products</p>
          <p className="text-sm text-muted-foreground">
            Scan a receipt and leave items unlinked to create drafts here.
          </p>
          <Link to="/admin/inventory" className="inline-block mt-3 text-sm text-primary hover:underline underline-offset-2">
            Go to Inventory →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map(d => (
            <DraftCard
              key={`${d.item_type}-${d.id}`}
              draft={d}
              onPublished={removeItem}
              onDiscarded={removeItem}
            />
          ))}
        </div>
      )}
    </div>
  )
}
