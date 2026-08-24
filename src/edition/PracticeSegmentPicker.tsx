import { useEffect, useRef } from 'react'
import type { PracticeUnit } from '../library/schema'

export interface PracticeSegmentPickerProps {
  units: readonly PracticeUnit[]
  currentUnitId: string
  open: boolean
  onSelect: (practiceUnitId: string) => void
  onClose: () => void
}

export function PracticeSegmentPicker({
  units,
  currentUnitId,
  open,
  onSelect,
  onClose,
}: PracticeSegmentPickerProps) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef(new Map<string, HTMLButtonElement>())

  useEffect(() => {
    if (!open) {
      return
    }

    const timeoutId = globalThis.setTimeout(() => {
      const list = listRef.current
      const item = itemRefs.current.get(currentUnitId)
      if (list && item) {
        revealPickerItem(list, item)
      }
    }, 0)

    return () => globalThis.clearTimeout(timeoutId)
  }, [currentUnitId, open])

  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) {
    return null
  }

  return (
    <div
      className="practice-segment-picker-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        className="practice-segment-picker"
        role="dialog"
        aria-modal="true"
        aria-label="选择学习段"
      >
        <header className="practice-segment-picker-header">
          <div>
            <p className="eyebrow">学唱段落</p>
            <h2>选择学习段</h2>
          </div>
          <button
            className="practice-segment-picker-close"
            type="button"
            aria-label="关闭学习段选择"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div
          ref={listRef}
          className="practice-segment-picker-list"
          role="listbox"
          aria-label="学习段"
          tabIndex={0}
        >
          {units.map((unit, index) => {
            const selected = unit.id === currentUnitId
            return (
              <button
                key={unit.id}
                ref={(element) => {
                  if (element) {
                    itemRefs.current.set(unit.id, element)
                  } else {
                    itemRefs.current.delete(unit.id)
                  }
                }}
                className={`practice-segment-picker-option${selected ? ' is-selected' : ''}`}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(unit.id)}
              >
                <span className="practice-segment-picker-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="practice-segment-picker-label">{unit.label}</span>
                <span className="practice-segment-picker-state" aria-hidden="true">
                  {selected ? '✓' : ''}
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function revealPickerItem(container: HTMLElement, item: HTMLElement): void {
  const inset = 12
  const itemTop = item.offsetTop
  const itemBottom = itemTop + item.offsetHeight
  const visibleTop = container.scrollTop + inset
  const visibleBottom = container.scrollTop + container.clientHeight - inset

  if (itemTop < visibleTop) {
    container.scrollTop = Math.max(0, itemTop - inset)
  } else if (itemBottom > visibleBottom) {
    container.scrollTop = Math.max(
      0,
      itemBottom - container.clientHeight + inset,
    )
  }
}
