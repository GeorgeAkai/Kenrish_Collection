interface Props {
  onConfirm: () => void
  onCancel: () => void
  label?: string
  loading?: boolean
}

export default function InlineConfirm({ onConfirm, onCancel, label = 'Delete', loading }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        onClick={onConfirm}
        disabled={loading}
        className="text-xs px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-colors disabled:opacity-60 whitespace-nowrap"
      >
        {loading ? '…' : label}
      </button>
      <button
        onClick={onCancel}
        disabled={loading}
        className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-muted font-medium transition-colors disabled:opacity-60"
      >
        Cancel
      </button>
    </span>
  )
}
