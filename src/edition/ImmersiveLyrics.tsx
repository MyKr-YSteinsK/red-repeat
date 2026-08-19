import type { AssembledSongEdition } from '../runtime/song-edition'
import type { SongEditionPlaybackSnapshot } from './use-song-edition-playback'

export interface ImmersiveLyricsProps {
  model: AssembledSongEdition
  playback: SongEditionPlaybackSnapshot
}

export function ImmersiveLyrics({
  model,
  playback,
}: ImmersiveLyricsProps) {
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

  return (
    <section
      className="immersive-lyrics"
      aria-labelledby="immersive-title"
      data-primary-occurrence-id={primaryOccurrenceId}
      data-current-section-id={resolution.currentSection?.id}
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

      <ol className="immersive-lyric-flow" aria-label="Immersive lyrics">
        {model.chronologicalOccurrences.map(({ occurrence, segment }) => {
          const isActive = activeOccurrenceIds.has(occurrence.id)
          const isPrimary = primaryOccurrenceId === occurrence.id
          const isContext =
            previousOccurrenceId === occurrence.id ||
            nextOccurrenceId === occurrence.id
          const className = [
            'immersive-occurrence',
            isActive ? 'is-active' : '',
            isPrimary ? 'is-primary' : '',
            isActive && !isPrimary ? 'is-secondary-active' : '',
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
              <p className="immersive-original">{segment.lyrics}</p>
              <p className="immersive-translation">{segment.translation}</p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
