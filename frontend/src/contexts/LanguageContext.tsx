import { createContext, useContext, useState, type ReactNode } from 'react'
import { translations, type Lang } from '@/i18n/translations'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  days: string[]
  months: string[]
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('kenrish-lang')
      return saved === 'sw' ? 'sw' : 'en'
    } catch {
      return 'en'
    }
  })

  function setLang(newLang: Lang) {
    setLangState(newLang)
    try { localStorage.setItem('kenrish-lang', newLang) } catch {}
  }

  function t(key: string, vars?: Record<string, string | number>): string {
    const dict = translations[lang]
    let value = dict[key] ?? translations.en[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replace(`{${k}}`, String(v))
      }
    }
    return value
  }

  const days = t('cal.days').split(',')
  const months = t('cal.months').split(',')

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, days, months }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
