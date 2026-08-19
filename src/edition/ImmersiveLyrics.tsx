import { useCallback, useEffect, useRef } from 'react'
import type { AssembledSongEdition } from '../runtime/song-edition'
import { getSectionCue, type ArtDirection } from '../theme/art-direction'
import type { SongEditionPlaybackSnapshot } from './use-song-edition-playback'

export interface ImmersiveLyricsProps {
  model: AssembledSongEdition
  playback: SongEditionPlaybackSnapshot
  artDirection?: ArtDirection
}

export function ImmersiveLyrics({
  model,
  playback,
  artDirection,
}: ImmersiveLyricsProps) {
  const flowRef = useRef<HTMLOListElement>(null)
  const previousPrimaryOccurrenceId = useRef<string | undefined>(undefined)
  const browseSuppressionUntil = useRef(0)
  const browseSuppressionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const { resolution } = playback
  const activeOccurrenceIds = new Set(
    resolution.activeOccurrences.map(({ id }) => id),
  )
  const primaryOccurrenceId = resolution.primaryOccurrence?.id
  const previousOccurrenceId = resolution.previousOccurrence?.id
  const nextOccurrenceId = resolution.nextOccurrence?.id
  const sectionLabel = resolution.currentSection?.label ?? 'Between Sections'
  const currentSectionHasLyrics = resolution.currentSection
    ? (model.occurrencesBySectionId[resolution.currentSection.id]?.length ?? 0) > 0
    : false

  const scrollToCurrent = useCallback(() => {
    if (!primaryOccurrenceId) {
      return
    }
    const element = Array.from(
      flowRef.current?.querySelectorAll<HTMLElement>('[data-occurrence-id]') ??
        [],
    ).find((candidate) => candidate.dataset.occurrenceId === primaryOccurrenceId)
    if (!element || typeof element.scrollIntoView !== 'function') {
      return
    }
    element.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'center',
    })
  }, [primaryOccurrenceId])

  useEffect(() => {
    const previousPrimaryId = previousPrimaryOccurrenceId.current
    previousPrimaryOccurrenceId.current = primaryOccurrenceId
    if (
      primaryOccurrenceId &&
      primaryOccurrenceId !== previousPrimaryId &&
      Date.now() >= browseSuppressionUntil.current
    ) {
      scrollToCurrent()
    }
  }, [primaryOccurrenceId, scrollToCurrent])

  useEffect(
    () => () => {
      if (browseSuppressionTimer.current !== undefined) {
        clearTimeout(browseSuppressionTimer.current)
      }
    },
    [],
  )

  const markUserBrowse = (): void => {
    browseSuppressionUntil.current = Date.now() + 1500
    if (browseSuppressionTimer.current !== undefined) {
      clearTimeout(browseSuppressionTimer.current)
    }
    browseSuppressionTimer.current = setTimeout(() => {
      browseSuppressionUntil.current = 0
      browseSuppressionTimer.current = undefined
    }, 1500)
  }

  return (
    <section
      className="immersive-lyrics"
      aria-labelledby="immersive-title"
      data-primary-occurrence-id={primaryOccurrenceId}
      data-current-section-id={resolution.currentSection?.id}
      data-section-cue={getSectionCue(artDirection, resolution.currentSection?.id)}
    >
      <header className="immersive-heading">
        <p className="eyebrow">IMMERSIVE / {model.edition.song.title}</p>
        <h2 id="immersive-title">{model.edition.song.artist}</h2>
        <p className="immersive-section-cue" aria-live="polite">
          NOW / {sectionLabel}
        </p>
      </header>

      <div className="immersive-current-cue" aria-live="polite">
        {resolution.primaryOccurrence ? (
          <p>Current Segment</p>
        ) : (
          <p className="immersive-empty-cue">
            {resolution.currentSection && !currentSectionHasLyrics
              ? 'Instrumental passage'
              : 'Between Sections'}
          </p>
        )}
      </div>

      <button
        className="immersive-return-current"
        type="button"
        disabled={!primaryOccurrenceId}
        onClick={() => {
          browseSuppressionUntil.current = 0
          scrollToCurrent()
        }}
      >
        Return to current
      </button>

      <ol
        className="immersive-lyric-flow"
        aria-label="Immersive lyrics"
        ref={flowRef}
        onPointerDown={markUserBrowse}
        onTouchMove={markUserBrowse}
        onWheel={markUserBrowse}
      >
        {model.chronologicalOccurrences.map(({ occurrence, segment }) => {
          const isActive = activeOccurrenceIds.has(occurrence.id)
          const isPrimary = primaryOccurrenceId === occurrence.id
          const isSelected =
            playback.selectedOccurrenceId === occurrence.id
          const isContext =
            previousOccurrenceId === occurrence.id ||
            nextOccurrenceId === occurrence.id
          const className = [
            'immersive-occurrence',
            isActive ? 'is-active' : '',
            isPrimary ? 'is-primary' : '',
            isActive && !isPrimary ? 'is-secondary-active' : '',
            isSelected ? 'is-selected' : '',
            isContext ? 'is-context' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <li
              className={className}
              key={occurrence.id}
              data-occurrence-id={occurrence.id}
              aria-current={isPrimary ? 'true' : undefined}
            >
              <button
                className="immersive-original"
                type="button"
                aria-label={`Play line ${segment.lyrics}`}
                onClick={() => playback.selectOccurrence(model.occurrencesById[occurrence.id])}
              >
                {segment.lyrics}
              </button>
              <p className="immersive-translation">{segment.translation}</p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
