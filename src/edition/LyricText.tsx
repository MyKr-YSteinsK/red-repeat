import type { ReactNode } from 'react'
import type { Segment } from '../library/schema'
import './LyricText.css'

export interface LyricTextProps {
  segment: Pick<Segment, 'lyrics' | 'ruby'>
  className?: string
}

/**
 * Render canonical lyric text with optional semantic ruby annotations.
 * The outer label/data attribute keeps the original lyric available to
 * assistive technology and copy-oriented consumers; <rt> is visual guidance.
 */
export function LyricText({ segment, className }: LyricTextProps) {
  const spans = [...(segment.ruby ?? [])].sort(
    (left, right) => left.start - right.start,
  )
  const pieces: ReactNode[] = []
  let cursor = 0

  spans.forEach((span, index) => {
    if (span.start > cursor) {
      pieces.push(segment.lyrics.slice(cursor, span.start))
    }
    pieces.push(
      <ruby key={`ruby-${span.start}-${span.end}-${index}`}>
        {span.base}
        <rt lang="ja">{span.reading}</rt>
      </ruby>,
    )
    cursor = span.end
  })

  if (cursor < segment.lyrics.length) {
    pieces.push(segment.lyrics.slice(cursor))
  }

  return (
    <span
      className={['lyric-ruby-text', className].filter(Boolean).join(' ')}
      aria-label={segment.lyrics}
      data-canonical-lyric={segment.lyrics}
    >
      {pieces.length > 0 ? pieces : segment.lyrics}
    </span>
  )
}
