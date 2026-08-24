import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  runStableContextTransition,
  restoreScrollPolicy,
  type ScrollAnchor,
} from './stable-context-transition'

afterEach(() => vi.restoreAllMocks())

describe('stable context transitions', () => {
  it('preserves an anchor with an immediate corrective scroll', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const target = document.createElement('h3')
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ top: 250 } as DOMRect)
    const anchor: ScrollAnchor = { scrollY: 200, top: 300 }

    restoreScrollPolicy('preserve-anchor', anchor, target)

    expect(scrollTo).toHaveBeenCalledWith({ top: 150, behavior: 'auto' })
  })

  it('reveals a new content start at the requested comfortable offset', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const target = document.createElement('h3')
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ top: 420 } as DOMRect)

    restoreScrollPolicy('reveal-content-start', undefined, target, 96)

    expect(scrollTo).toHaveBeenCalledWith({ top: 324, behavior: 'auto' })
  })

  it('does not move the page for the explicit no-scroll policy', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const target = document.createElement('h3')

    restoreScrollPolicy('no-scroll', undefined, target)

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('does not correct an anchor that is already in the same position', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const target = document.createElement('h3')
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ top: 96 } as DOMRect)

    restoreScrollPolicy('preserve-anchor', { scrollY: 0, top: 96 }, target)

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('falls back to the synchronous update when View Transition is unavailable', () => {
    const originalStartViewTransition = (
      document as unknown as { startViewTransition?: unknown }
    ).startViewTransition
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: undefined,
    })
    const update = vi.fn()

    try {
      runStableContextTransition(update)
      expect(update).toHaveBeenCalledOnce()
    } finally {
      if (originalStartViewTransition) {
        Object.defineProperty(document, 'startViewTransition', {
          configurable: true,
          value: originalStartViewTransition,
        })
      } else {
        delete (document as { startViewTransition?: unknown }).startViewTransition
      }
    }
  })

  it('uses the reduced-motion fallback without starting a View Transition', () => {
    const originalMatchMedia = window.matchMedia
    const originalStartViewTransition = (
      document as unknown as { startViewTransition?: unknown }
    ).startViewTransition
    const startViewTransition = vi.fn()
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: true })),
    })
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    })
    const update = vi.fn()

    try {
      runStableContextTransition(update)
      expect(update).toHaveBeenCalledOnce()
      expect(startViewTransition).not.toHaveBeenCalled()
    } finally {
      if (originalMatchMedia) {
        Object.defineProperty(window, 'matchMedia', {
          configurable: true,
          value: originalMatchMedia,
        })
      } else {
        delete (window as { matchMedia?: typeof window.matchMedia }).matchMedia
      }
      if (originalStartViewTransition) {
        Object.defineProperty(document, 'startViewTransition', {
          configurable: true,
          value: originalStartViewTransition,
        })
      } else {
        delete (document as { startViewTransition?: unknown }).startViewTransition
      }
    }
  })
})
