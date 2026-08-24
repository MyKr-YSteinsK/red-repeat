import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PracticeUnit } from '../library/schema'
import { PracticeSegmentPicker } from './PracticeSegmentPicker'

const units: readonly PracticeUnit[] = [
  { id: 'p001', sectionId: 'verse', label: 'Verse', occurrenceIds: ['o001'] },
  { id: 'p002', sectionId: 'chorus', label: 'Chorus', occurrenceIds: ['o002'] },
]

afterEach(() => cleanup())

describe('PracticeSegmentPicker', () => {
  it('reveals the selected option inside its own list without using page scrolling', async () => {
    const onSelect = vi.fn()
    const scrollIntoView = vi.fn()
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoView,
    })

    try {
      render(
        <PracticeSegmentPicker
          units={units}
          currentUnitId="p002"
          open
          onSelect={onSelect}
          onClose={vi.fn()}
        />,
      )

      const list = screen.getByRole('listbox') as HTMLElement
      const selectedOption = screen.getByRole('option', { name: /Chorus/ }) as HTMLElement
      Object.defineProperty(list, 'clientHeight', { configurable: true, value: 80 })
      Object.defineProperty(list, 'scrollTop', {
        configurable: true,
        writable: true,
        value: 0,
      })
      Object.defineProperty(selectedOption, 'offsetTop', {
        configurable: true,
        value: 100,
      })
      Object.defineProperty(selectedOption, 'offsetHeight', {
        configurable: true,
        value: 40,
      })

      await waitFor(() => expect(list.scrollTop).toBe(72))
      expect(scrollIntoView).not.toHaveBeenCalled()
      expect(screen.getByRole('option', { name: /Chorus/ })).toHaveAttribute(
        'aria-selected',
        'true',
      )

      fireEvent.click(screen.getByRole('option', { name: /Verse/ }))
      expect(onSelect).toHaveBeenCalledWith('p001')
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
          configurable: true,
          writable: true,
          value: originalScrollIntoView,
        })
      } else {
        delete (HTMLElement.prototype as { scrollIntoView?: () => void }).scrollIntoView
      }
    }
  })
})
