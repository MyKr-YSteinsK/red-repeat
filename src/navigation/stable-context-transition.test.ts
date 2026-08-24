import { afterEach, describe, expect, it, vi } from 'vitest'
import {
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
})
