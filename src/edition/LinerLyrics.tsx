import { useState } from 'react'
import type {
  AssembledOccurrence,
  AssembledSongEdition,
} from '../runtime/song-edition'
import type { ArtDirection } from '../theme/art-direction'
import { getSectionCue } from '../theme/art-direction'

export interface LinerLyricsProps {
  model: AssembledSongEdition
  artDirection?: ArtDirection
  activeOccurrenceIds?: ReadonlySet<string>
  primaryOccurrenceId?: string
  selectedOccurrenceId?: string
  readingVisible?: boolean
  onToggleReading?: () => void
  onSelectOccurrence?: (occurrence: AssembledOccurrence) => void
}

export function LinerLyrics({
  model,
  artDirection,
  activeOccurrenceIds = new Set<string>(),
  primaryOccurrenceId,
  selectedOccurrenceId,
  readingVisible: controlledReadingVisible,
  onToggleReading,
  onSelectOccurrence,
}: LinerLyricsProps) {
  const [internalReadingVisible, setInternalReadingVisible] = useState(false)
  const readingVisible = controlledReadingVisible ?? internalReadingVisible
  const toggleReading =
    onToggleReading ?? (() => setInternalReadingVisible((visible) => !visible))

  return (
    <section className="liner-lyrics" aria-labelledby="lyrics-title">
      <div className="lyrics-heading">
        <div>
          <p className="eyebrow">LYRICS / TIMELINE</p>
          <h2 id="lyrics-title">The work in time.</h2>
        </div>
        <button
          className="reading-toggle"
          type="button"
          aria-pressed={readingVisible}
          onClick={toggleReading}
        >
          {readingVisible ? 'Hide reading' : 'Show reading'}
        </button>
      </div>

      <div className="lyrics-sections">
        {model.sections.map(({ section, occurrences }, sectionIndex) => (
          <section
            className="lyrics-section"
            key={section.id}
            aria-labelledby={`section-${section.id}`}
            data-section-cue={getSectionCue(artDirection, section.id)}
          >
            <div className="section-heading">
              <p className="section-index" aria-hidden="true">
                {String(sectionIndex + 1).padStart(2, '0')}
              </p>
              <h3 id={`section-${section.id}`}>{section.label}</h3>
            </div>
            {occurrences.length === 0 ? (
              <p className="instrumental-marker">
                <span className="instrumental-dot" aria-hidden="true" />
                Instrumental passage
              </p>
            ) : (
              <div className="occurrence-list">
                {occurrences.map((assembledOccurrence) => (
                  <RenderedOccurrence
                    key={assembledOccurrence.occurrence.id}
                    assembledOccurrence={assembledOccurrence}
                    readingVisible={readingVisible}
                    isActive={activeOccurrenceIds.has(
                      assembledOccurrence.occurrence.id,
                    )}
                    isPrimary={
                      primaryOccurrenceId === assembledOccurrence.occurrence.id
                    }
                    isSelected={
                      selectedOccurrenceId === assembledOccurrence.occurrence.id
                    }
                    onSelect={onSelectOccurrence}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  )
}

function RenderedOccurrence({
  assembledOccurrence,
  readingVisible,
  isActive,
  isPrimary,
  isSelected,
  onSelect,
}: {
  assembledOccurrence: AssembledOccurrence
  readingVisible: boolean
  isActive: boolean
  isPrimary: boolean
  isSelected: boolean
  onSelect?: (occurrence: AssembledOccurrence) => void
}) {
  const { occurrence, segment } = assembledOccurrence
  const notesId = `notes-${occurrence.id}`
  const className = [
    'lyric-occurrence',
    isActive ? 'is-active' : '',
    isPrimary ? 'is-primary' : '',
    isSelected ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      className={className}
      data-occurrence-id={occurrence.id}
      aria-describedby={segment.notes?.length ? notesId : undefined}
    >
      <button
        className="lyric-original"
        type="button"
        aria-label={`Play line ${segment.lyrics}`}
        onClick={() => onSelect?.(assembledOccurrence)}
      >
        <span className="lyric-original-text">{segment.lyrics}</span>
      </button>
      <p className="lyric-translation">{segment.translation}</p>
      {readingVisible && segment.layers?.length ? (
        <div className="lyric-readings" aria-label="Reading layers">
          {segment.layers.map((layer) => (
            <p className="lyric-reading" key={layer.id}>
              <span className="lyric-layer-label">{layer.label}</span>
              <span>{layer.text}</span>
            </p>
          ))}
        </div>
      ) : null}
      {segment.notes?.length ? (
        <aside className="lyric-notes" id={notesId} aria-label="Line notes">
          {segment.notes.map((note, index) => (
            <div className="lyric-note" key={`${occurrence.id}-note-${index}`}>
              {note.title ? <h4>{note.title}</h4> : null}
              <p>{note.body}</p>
            </div>
          ))}
        </aside>
      ) : null}
    </article>
  )
}
