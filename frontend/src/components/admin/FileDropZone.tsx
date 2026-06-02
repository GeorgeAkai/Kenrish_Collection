import { useRef, useState, type DragEvent } from 'react'
import { UploadCloud, X, FileVideo, Image as ImageIcon } from 'lucide-react'

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  file: File | null
  onFileChange: (file: File | null) => void
  accept?: string
  currentUrl?: string | null
}

export default function FileDropZone({ file, onFileChange, accept = 'image/*', currentUrl }: Props) {
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function pick(f: File) {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(f))
    onFileChange(f)
  }

  function clear() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    onFileChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function onDragOver(e: DragEvent) { e.preventDefault(); setDragging(true) }
  function onDragLeave(e: DragEvent) { e.preventDefault(); setDragging(false) }
  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) pick(f)
  }

  const isVideo = file?.type.startsWith('video/')

  if (file && preview) {
    return (
      <div className="rounded-xl overflow-hidden border bg-muted">
        {isVideo
          ? <video src={preview} controls className="w-full max-h-48 object-contain" />
          : <img src={preview} alt="preview" className="w-full max-h-48 object-contain" />
        }
        <div className="px-3 py-2 flex items-center gap-3">
          {isVideo
            ? <FileVideo size={15} className="text-muted-foreground shrink-0" />
            : <ImageIcon size={15} className="text-muted-foreground shrink-0" />
          }
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          <button type="button" onClick={clear} className="text-muted-foreground hover:text-destructive transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {currentUrl && (
        <div className="flex items-center gap-2">
          <img src={currentUrl} alt="current" className="w-14 h-14 object-cover rounded-lg border" />
          <p className="text-xs text-muted-foreground">Current image — drop below to replace</p>
        </div>
      )}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 px-4 cursor-pointer transition-all
          ${dragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/40'
          }
        `}
      >
        <UploadCloud size={28} className={`transition-colors ${dragging ? 'text-primary' : 'text-muted-foreground'}`} />
        <div className="text-center">
          <p className="text-sm font-medium">{dragging ? 'Drop it!' : 'Drag & drop'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            or <span className="text-primary underline underline-offset-2">click to browse</span>
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) pick(f) }}
        />
      </div>
    </div>
  )
}
