export type TransitionPolicy =
  | 'preserve-anchor'
  | 'reveal-content-start'
  | 'no-scroll'

export interface ScrollAnchor {
  scrollY: number
  top: number
}

interface ViewTransitionDocument {
  startViewTransition?: (update: () => void) => { finished: Promise<void> }
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
    const targetBottom = target.getBoundingClientRect().bottom
    const viewportHeight = window.innerHeight
    const needsReveal = targetTop < topOffset || targetBottom > viewportHeight
    if (needsReveal) {
      window.scrollTo({
        top: Math.max(0, window.scrollY + targetTop - topOffset),
        behavior: 'auto',
      })
    }
  }
}

export function runStableContextTransition(update: () => void): void {
  const documentWithTransition = document as unknown as ViewTransitionDocument
  if (
    !prefersReducedMotion() &&
    typeof documentWithTransition.startViewTransition === 'function'
  ) {
    void documentWithTransition.startViewTransition(update).finished.catch(() => undefined)
    return
  }
  update()
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
