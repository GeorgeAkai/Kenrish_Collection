import { useState } from 'react'

export function useConfirm<T = number>() {
  const [pending, setPending] = useState<T | null>(null)
  return {
    pending,
    ask: (id: T) => setPending(id),
    cancel: () => setPending(null),
    isAsking: (id: T) => pending === id,
  }
}
