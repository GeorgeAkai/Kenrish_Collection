/**
 * Colour the phone's status bar / browser chrome to match the header (the --card colour),
 * following the in-app light/dark toggle and accent rather than the device setting.
 * Call after changing the `dark` class or `data-accent` on <html>.
 */
export function syncThemeColor() {
  const card = getComputedStyle(document.documentElement).getPropertyValue('--card').trim()
  if (!card) return
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach(m => {
    m.removeAttribute('media')
    m.content = card
  })
}
