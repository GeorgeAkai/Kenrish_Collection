import { useEffect, useState } from 'react'
import { Download, X, Share } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'kenrish-install-dismissed-at'
const DISMISS_DAYS = 7

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

function recentlyDismissed() {
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const days = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24)
  return days < DISMISS_DAYS
}

export default function InstallPrompt() {
  const { t } = useLanguage()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosVisible, setIosVisible] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)

    const ua = navigator.userAgent
    const isIOS = /iphone|ipad|ipod/i.test(ua)
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)
    if (isIOS && isSafari) setIosVisible(true)

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
    setIosVisible(false)
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
    if (outcome !== 'accepted') localStorage.setItem(DISMISS_KEY, String(Date.now()))
  }

  if (!visible && !iosVisible) return null

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[calc(100vw-2rem)] sm:w-80 bg-background border rounded-2xl shadow-2xl p-4 flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2">
      <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border">
        <img src="/icon-192.png" alt="" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{t(visible ? 'install.title' : 'install.iosTitle')}</p>
        <p className="text-muted-foreground text-xs mt-0.5 leading-snug">
          {t(visible ? 'install.body' : 'install.iosBody')}
        </p>
        {visible ? (
          <div className="flex gap-2 mt-3">
            <button onClick={install} className="btn-modern btn-modern--primary text-xs px-3 py-1.5 flex items-center gap-1.5">
              <Download size={13} /> {t('install.cta')}
            </button>
            <button onClick={dismiss} className="text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground">
              {t('install.dismiss')}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
            <Share size={13} className="shrink-0" />
          </div>
        )}
      </div>
      <button onClick={dismiss} aria-label={t('install.dismiss')} className="shrink-0 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  )
}
