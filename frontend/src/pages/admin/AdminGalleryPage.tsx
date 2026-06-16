import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { UploadCloud, X, FileVideo, Image } from 'lucide-react'
import api from '@/lib/axios'
import { isVideoUrl } from '@/lib/utils'
import type { GalleryImage } from '@/lib/types'
import InlineConfirm from '@/components/InlineConfirm'
import { useConfirm } from '@/hooks/useConfirm'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isVideoFile(file: File) {
  return file.type.startsWith('video/')
}

export default function AdminGalleryPage() {
  const [items, setItems] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const del = useConfirm<number>()

  const fetchItems = () => {
    api.get('/admin/gallery/').then(r => setItems(r.data.results ?? r.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  function selectFile(f: File) {
    setFile(f)
    setError('')
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  function clearFile() {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function closeForm() {
    setShowForm(false)
    clearFile()
    setDescription('')
    setError('')
    setProgress(0)
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) selectFile(dropped)
  }

  async function handleDelete(id: number) {
    del.cancel()
    await api.delete(`/admin/gallery/${id}/`)
    fetchItems()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) { setError('Please select a file.'); return }
    setSaving(true)
    setError('')
    setProgress(0)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (description) fd.append('description', description)
      await api.post('/admin/gallery/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
        },
      })
      closeForm()
      fetchItems()
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Gallery</h2>
        <button
          onClick={() => { setShowForm(true); setError('') }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
        >
          + Upload
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map(item => (
            <div key={item.id} className="group relative border rounded-lg overflow-hidden">
              {isVideoUrl(item.file, item.is_video) ? (
                <video src={item.file} muted playsInline preload="metadata" className="w-full aspect-square object-cover" />
              ) : (
                <img src={item.file} alt={item.description || ''} className="w-full aspect-square object-cover" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <p className="text-white text-xs text-center px-2 line-clamp-2">{item.description}</p>
                <div className="flex items-center gap-1 text-white text-xs">♥ {item.like_count}</div>
                {del.isAsking(item.id) ? (
                  <InlineConfirm onConfirm={() => handleDelete(item.id)} onCancel={del.cancel} />
                ) : (
                  <button onClick={() => del.ask(item.id)}
                    className="bg-red-500 text-white text-xs px-3 py-1.5 rounded hover:bg-red-600">Delete</button>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-muted-foreground col-span-5 py-10 text-center">No gallery items yet.</p>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Upload to Gallery</h3>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Drop zone */}
              {!file ? (
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors
                    ${dragging
                      ? 'border-primary bg-primary/5 scale-[1.01]'
                      : 'border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/50'
                    }
                  `}
                >
                  <UploadCloud size={36} className={`transition-colors ${dragging ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="text-center">
                    <p className="text-sm font-medium">{dragging ? 'Drop it!' : 'Drag & drop here'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">or <span className="text-primary underline underline-offset-2">click to browse</span></p>
                  </div>
                  <p className="text-xs text-muted-foreground">Images & videos supported</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.heic,.heif,video/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) selectFile(f) }}
                  />
                </div>
              ) : (
                /* Preview */
                <div className="relative rounded-xl overflow-hidden border bg-muted">
                  {isVideoFile(file) ? (
                    <video src={preview!} controls className="w-full max-h-56 object-contain" />
                  ) : (
                    <img src={preview!} alt="preview" className="w-full max-h-56 object-contain" />
                  )}
                  <div className="p-3 flex items-center gap-3">
                    {isVideoFile(file)
                      ? <FileVideo size={16} className="text-muted-foreground shrink-0" />
                      : <Image size={16} className="text-muted-foreground shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                    </div>
                    <button type="button" onClick={clearFile} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                <textarea
                  rows={2}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What's this about?"
                />
              </div>

              {/* Upload progress */}
              {saving && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uploading…</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving || !file}
                  className="flex-1 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? 'Uploading…' : 'Upload'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 border rounded-md py-2 text-sm hover:bg-muted transition-colors"
                >
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
