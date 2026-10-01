import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { syncThemeColor } from '@/lib/themeColor'

export type Accent = 'gold' | 'pink' | 'mauve' | 'green' | 'blue'

export const ACCENTS: { key: Accent; label: string; swatch: string }[] = [
  { key: 'gold', label: 'Gold', swatch: '#d4a373' },
  { key: 'pink', label: 'Pink', swatch: '#d6538c' },
  { key: 'mauve', label: 'Mauve', swatch: '#7C3060' },
  { key: 'green', label: 'Green', swatch: '#2f7d4f' },
  { key: 'blue', label: 'Blue', swatch: '#2f6fd6' },
]

const STORAGE_KEY = 'kenrish-accent'

interface AccentContextValue {
  accent: Accent
  setAccent: (a: Accent) => void
}

const AccentContext = createContext<AccentContextValue | null>(null)

function readStored(): Accent {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw && ACCENTS.some(a => a.key === raw)) return raw as Accent
  } catch { /* ignore */ }
  return 'gold'
}

export function AccentThemeProvider({ children }: { children: ReactNode }) {
  const [accent, setAccent] = useState<Accent>(readStored)

  useEffect(() => {
    if (accent === 'gold') {
      delete document.documentElement.dataset.accent
    } else {
      document.documentElement.dataset.accent = accent
    }
    try { localStorage.setItem(STORAGE_KEY, accent) } catch { /* ignore */ }
    syncThemeColor()
  }, [accent])

  return (
    <AccentContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentContext.Provider>
  )
}

export function useAccentTheme() {
  const ctx = useContext(AccentContext)
  if (!ctx) throw new Error('useAccentTheme must be used within AccentThemeProvider')
  return ctx
}
