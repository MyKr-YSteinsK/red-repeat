export type TransitionPolicy =
  | 'preserve-anchor'
  | 'reveal-content-start'
  | 'no-scroll'

export interface ScrollAnchor {
  scrollY: number
  top: number
}

export function captureScrollAnchor(element: Element | null): ScrollAnchor | undefined {
  if (!element || typeof window === 'undefined') {
    return undefined
  }
  return {
    scrollY: window.scrollY,
    top: element.getBoundingClientRect().top,
  }
}

export function restoreScrollPolicy(
  policy: TransitionPolicy,
  anchor: ScrollAnchor | undefined,
  target: Element | null,
  topOffset = 0,
): void {
  if (typeof window === 'undefined' || policy === 'no-scroll') {
    return
  }

  if (policy === 'preserve-anchor' && anchor && target) {
    const nextScrollY = Math.max(
      0,
      anchor.scrollY + target.getBoundingClientRect().top - anchor.top,
    )
    if (Math.abs(nextScrollY - window.scrollY) > 0.5) {
      window.scrollTo({ top: nextScrollY, behavior: 'auto' })
    }
    return
  }

  if (policy === 'reveal-content-start' && target) {
    const targetTop = target.getBoundingClientRect().top
    const nextScrollY = Math.max(0, window.scrollY + targetTop - topOffset)
    if (Math.abs(nextScrollY - window.scrollY) > 0.5) {
      window.scrollTo({ top: nextScrollY, behavior: 'auto' })
    }
  }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
