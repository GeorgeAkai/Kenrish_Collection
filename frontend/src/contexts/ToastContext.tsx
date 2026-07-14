import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle, AlertTriangle, X, Undo2 } from 'lucide-react'

type ToastKind = 'error' | 'success'

interface Toast {
  id: number
  kind: ToastKind
  message: string
  action?: { label: string; onClick: () => void }
}

interface ToastApi {
  error: (message: string) => void
  success: (message: string, action?: { label: string; onClick: () => void }) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const push = useCallback((kind: ToastKind, message: string, action?: Toast['action']) => {
    const id = nextId.current++
    setToasts(t => [...t, { id, kind, message, action }])
    setTimeout(() => dismiss(id), action ? 6000 : 4000)
  }, [dismiss])

  const api: ToastApi = {
    error: message => push('error', message),
    success: (message, action) => push('success', message, action),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map(toast => (
          <div
            key={toast.id}
            role="status"
            className={`flex items-start gap-2.5 p-3.5 rounded-xl shadow-lg border text-sm animate-in ${
              toast.kind === 'error'
                ? 'bg-destructive/10 border-destructive/20 text-destructive'
                : 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
            }`}
          >
            {toast.kind === 'error' ? <AlertTriangle size={16} className="shrink-0 mt-0.5" /> : <CheckCircle size={16} className="shrink-0 mt-0.5" />}
            <p className="flex-1 leading-snug">{toast.message}</p>
            {toast.action && (
              <button
                onClick={() => { toast.action!.onClick(); dismiss(toast.id) }}
                className="shrink-0 flex items-center gap-1 text-xs font-semibold underline underline-offset-2 hover:no-underline"
              >
                <Undo2 size={12} /> {toast.action.label}
              </button>
            )}
            <button onClick={() => dismiss(toast.id)} className="shrink-0 opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be within ToastProvider')
  return ctx
}
