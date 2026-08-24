import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'

export const SWIPE_REVEAL_MAX_PX = 68
export const SWIPE_REVEAL_OPEN_THRESHOLD_PX = 36

const AXIS_LOCK_THRESHOLD_PX = 8

type SwipeAxis = 'pending' | 'horizontal' | 'vertical'

interface PointerSession {
  pointerId: number
  startX: number
  startY: number
  startOffset: number
  axis: SwipeAxis
  currentOffset: number
  didSwipe: boolean
}

export interface SwipeRevealOptions {
  enabled: boolean
  open: boolean
  onOpen: () => void
  onClose: () => void
}

export interface SwipeRevealBindings {
  style: CSSProperties
  'data-swipe-dragging': 'true' | undefined
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void
  onClick: (event: ReactMouseEvent<HTMLDivElement>) => void
}

export function useSwipeReveal({
  enabled,
  open,
  onOpen,
  onClose,
}: SwipeRevealOptions): SwipeRevealBindings {
  const [offsetPx, setOffsetPx] = useState(open ? -SWIPE_REVEAL_MAX_PX : 0)
  const [isDragging, setIsDragging] = useState(false)
  const pointerRef = useRef<PointerSession | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    if (!pointerRef.current) {
      setOffsetPx(open ? -SWIPE_REVEAL_MAX_PX : 0)
    }
  }, [open])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>): void => {
      if (!enabled || (event.pointerType === 'mouse' && event.button !== 0)) {
        return
      }

      pointerRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffset: open ? -SWIPE_REVEAL_MAX_PX : 0,
        axis: 'pending',
        currentOffset: open ? -SWIPE_REVEAL_MAX_PX : 0,
        didSwipe: false,
      }
      suppressClickRef.current = false
    },
    [enabled, open],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>): void => {
      const session = pointerRef.current
      if (!session || session.pointerId !== event.pointerId) {
        return
      }

      const deltaX = event.clientX - session.startX
      const deltaY = event.clientY - session.startY
      if (session.axis === 'pending') {
        if (
          Math.abs(deltaX) <= AXIS_LOCK_THRESHOLD_PX &&
          Math.abs(deltaY) <= AXIS_LOCK_THRESHOLD_PX
        ) {
          return
        }

        if (
          Math.abs(deltaX) <= AXIS_LOCK_THRESHOLD_PX ||
          Math.abs(deltaX) <= Math.abs(deltaY)
        ) {
          session.axis = 'vertical'
          return
        }

        session.axis = 'horizontal'
        session.didSwipe = true
        setIsDragging(true)
        if (typeof event.currentTarget.setPointerCapture === 'function') {
          event.currentTarget.setPointerCapture(event.pointerId)
        }
      }

      if (session.axis !== 'horizontal') {
        return
      }

      event.preventDefault()
      const nextOffset = clamp(
        session.startOffset + deltaX,
        -SWIPE_REVEAL_MAX_PX,
        0,
      )
      session.currentOffset = nextOffset
      setOffsetPx(nextOffset)
    },
    [],
  )

  const finishPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>): void => {
      const session = pointerRef.current
      if (!session || session.pointerId !== event.pointerId) {
        return
      }

      if (session.axis === 'horizontal') {
        const shouldOpen =
          session.currentOffset <= SWIPE_REVEAL_OPEN_THRESHOLD_PX * -1
        suppressClickRef.current = session.didSwipe
        setOffsetPx(shouldOpen ? -SWIPE_REVEAL_MAX_PX : 0)
        if (shouldOpen) {
          onOpen()
        } else {
          onClose()
        }
      } else {
        setOffsetPx(open ? -SWIPE_REVEAL_MAX_PX : 0)
      }

      pointerRef.current = null
      setIsDragging(false)
    },
    [onClose, onOpen, open],
  )

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>): void => {
      const session = pointerRef.current
      if (!session || session.pointerId !== event.pointerId) {
        return
      }
      pointerRef.current = null
      setOffsetPx(open ? -SWIPE_REVEAL_MAX_PX : 0)
      setIsDragging(false)
    },
    [open],
  )

  const onClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>): void => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false
        event.preventDefault()
        event.stopPropagation()
        return
      }

      if (open) {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
    },
    [onClose, open],
  )

  return {
    style: {
      transform: `translate3d(${offsetPx}px, 0, 0)`,
      transition: isDragging ? 'none' : undefined,
    },
    'data-swipe-dragging': isDragging ? 'true' : undefined,
    onPointerDown,
    onPointerMove,
    onPointerUp: finishPointer,
    onPointerCancel,
    onClick,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
