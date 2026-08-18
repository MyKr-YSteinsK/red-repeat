import { useState } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import { LinerLyrics } from './LinerLyrics'
import { PlaybackDock } from './PlaybackDock'
import { useSongEditionPlayback } from './use-song-edition-playback'
import type { RuntimeClient } from '../runtime/runtime-client'
import type { AssembledSongEdition } from '../runtime/song-edition'

export interface SongEditionPlaybackSurfaceProps {
  model: AssembledSongEdition
  runtimeClient: RuntimeClient
  audioEngine?: AudioEngine
}

export function SongEditionPlaybackSurface({
  model,
  runtimeClient,
  audioEngine,
}: SongEditionPlaybackSurfaceProps) {
  const playback = useSongEditionPlayback(model, runtimeClient, audioEngine)
  const [focusMode, setFocusMode] = useState(false)
  const [focusReadingVisible, setFocusReadingVisible] = useState(false)
  const activeOccurrenceIds = new Set(
    playback.resolution.activeOccurrences.map(({ id }) => id),
  )
  const sectionLabel = playback.resolution.currentSection?.label ?? 'Gap'

  return (
    <section
      className={`song-playback-surface${focusMode ? ' is-focus-mode' : ''}`}
      aria-label="Song timeline playback"
      data-engine-active-occurrence-id={
        playback.audioState.activeOccurrenceId
      }
      data-selected-occurrence-id={playback.selectedOccurrenceId}
    >
      {focusMode ? (
        <FocusPanel
          model={model}
          playback={playback}
          readingVisible={focusReadingVisible}
          onToggleReading={() => setFocusReadingVisible((visible) => !visible)}
        />
      ) : (
        <>
          <p className="playback-context" role="status">
            <span>NOW / {sectionLabel}</span>
            <span>
              {playback.resolution.primaryOccurrence
                ? `Line ${playback.resolution.primaryOccurrence.id}`
                : 'No lyric active'}
            </span>
          </p>
          <LinerLyrics
            model={model}
            activeOccurrenceIds={activeOccurrenceIds}
            primaryOccurrenceId={playback.resolution.primaryOccurrence?.id}
            selectedOccurrenceId={playback.selectedOccurrenceId}
            onSelectOccurrence={playback.selectOccurrence}
          />
        </>
      )}
      <PlaybackDock
        model={model}
        playback={playback}
        focusMode={focusMode}
        onToggleFocus={() => setFocusMode((mode) => !mode)}
      />
    </section>
  )
}

function FocusPanel({
  model,
  playback,
  readingVisible,
  onToggleReading,
}: {
  model: AssembledSongEdition
  playback: ReturnType<typeof useSongEditionPlayback>
  readingVisible: boolean
  onToggleReading: () => void
}) {
  const primary = playback.resolution.primaryOccurrence
    ? model.occurrencesById[playback.resolution.primaryOccurrence.id]
    : null
  const selected = playback.selectedOccurrenceId
    ? model.occurrencesById[playback.selectedOccurrenceId]
    : null
  const current = primary ?? selected
  const previous = playback.resolution.previousOccurrence
    ? model.occurrencesById[playback.resolution.previousOccurrence.id]
    : null
  const next = playback.resolution.nextOccurrence
    ? model.occurrencesById[playback.resolution.nextOccurrence.id]
    : null

  return (
    <section className="focus-panel" aria-labelledby="focus-title">
      <p className="eyebrow">FOCUS / {playback.resolution.currentSection?.label ?? 'GAP'}</p>
      <div className="focus-heading">
        <h2 id="focus-title">
          {current ? current.segment.lyrics : 'No lyric active'}
        </h2>
        <button
          className="reading-toggle"
          type="button"
          aria-pressed={readingVisible}
          onClick={onToggleReading}
        >
          {readingVisible ? 'Hide reading' : 'Show reading'}
        </button>
      </div>
      {current ? (
        <>
          <p className="focus-translation">{current.segment.translation}</p>
          {readingVisible && current.segment.layers?.length ? (
            <div className="focus-reading" aria-label="Reading layers">
              {current.segment.layers.map((layer) => (
                <span key={layer.id}>
                  <b>{layer.label}</b> {layer.text}
                </span>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className="focus-state">
          {playback.resolution.currentSection
            ? 'Instrumental passage'
            : 'A gap between Sections'}
        </p>
      )}
      <div className="focus-cues" aria-label="Adjacent cues">
        <span>{previous ? `Previous / ${previous.segment.lyrics}` : 'Previous / —'}</span>
        <span>{next ? `Next / ${next.segment.lyrics}` : 'Next / —'}</span>
      </div>
    </section>
  )
}
