import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useState } from 'react'
import { useSwipeReveal } from './use-swipe-reveal'

afterEach(() => cleanup())

beforeEach(() => {
  window.history.replaceState({}, '', '/')
})

describe('useSwipeReveal', () => {
  it('keeps sub-threshold and vertical gestures closed', () => {
    render(<SwipeHarness />)
    const surface = screen.getByTestId('surface-a')

    swipe(surface, { x: 220, y: 24 }, { x: 214, y: 24 })
    expect(screen.getByTestId('row-a')).not.toHaveAttribute('data-open', 'true')

    swipe(surface, { x: 220, y: 24 }, { x: 190, y: 64 })
    expect(screen.getByTestId('row-a')).not.toHaveAttribute('data-open', 'true')
    expect(surface).toHaveStyle({ transform: 'translate3d(0px, 0, 0)' })
  })

  it('opens one row at a time and suppresses the navigation click emitted by a swipe', async () => {
    render(<SwipeHarness />)
    const surfaceA = screen.getByTestId('surface-a')
    const surfaceB = screen.getByTestId('surface-b')

    swipe(surfaceA, { x: 220, y: 24 }, { x: 160, y: 24 })
    expect(screen.getByTestId('row-a')).toHaveAttribute('data-open', 'true')

    swipe(surfaceB, { x: 220, y: 24 }, { x: 160, y: 24 })
    await waitFor(() => {
      expect(screen.getByTestId('row-a')).not.toHaveAttribute('data-open', 'true')
      expect(screen.getByTestId('row-b')).toHaveAttribute('data-open', 'true')
    })

    fireEvent.click(surfaceB)
    expect(window.location.hash).toBe('')
    expect(screen.getByTestId('row-b')).toHaveAttribute('data-open', 'true')

    fireEvent.click(surfaceB)
    expect(screen.getByTestId('row-b')).not.toHaveAttribute('data-open', 'true')
    expect(window.location.hash).toBe('')
  })
})

function SwipeHarness() {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <div>
      {['a', 'b'].map((id) => (
        <SwipeRow
          key={id}
          id={id}
          open={openId === id}
          onOpen={() => setOpenId(id)}
          onClose={() => setOpenId(null)}
        />
      ))}
    </div>
  )
}

function SwipeRow({
  id,
  open,
  onOpen,
  onClose,
}: {
  id: string
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  const swipe = useSwipeReveal({
    enabled: true,
    open,
    onOpen,
    onClose,
  })
  return (
    <div data-testid={`row-${id}`} data-open={open ? 'true' : undefined}>
      <div data-testid={`surface-${id}`} {...swipe}>
        <a href={`#${id}`}>{id}</a>
      </div>
    </div>
  )
}

function swipe(
  surface: HTMLElement,
  start: { x: number; y: number },
  end: { x: number; y: number },
): void {
  fireEvent.pointerDown(surface, {
    pointerId: 1,
    pointerType: 'touch',
    clientX: start.x,
    clientY: start.y,
  })
  fireEvent.pointerMove(surface, {
    pointerId: 1,
    pointerType: 'touch',
    clientX: end.x,
    clientY: end.y,
  })
  fireEvent.pointerUp(surface, {
    pointerId: 1,
    pointerType: 'touch',
    clientX: end.x,
    clientY: end.y,
  })
}
