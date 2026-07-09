/**
 * On some iOS standalone launches, WebKit allocates a content frame shorter
 * than the true screen (confirmed via on-device diagnostics: reported
 * viewport ~60pt short, with nothing paintable below it) - and rotating the
 * device once makes it recompute correctly and fixes it. This nudges the
 * `viewport-fit` value on load to force the same recomputation WebKit does
 * on an orientation change, without requiring the user to actually rotate.
 */
export function nudgeViewport(): void {
  const meta = document.querySelector('meta[name="viewport"]')
  if (!meta) return
  const original = meta.getAttribute('content')
  if (!original || !original.includes('viewport-fit=cover')) return

  meta.setAttribute('content', original.replace('viewport-fit=cover', 'viewport-fit=auto'))
  requestAnimationFrame(() => {
    meta.setAttribute('content', original)
  })
}
