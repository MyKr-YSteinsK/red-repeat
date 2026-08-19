import { useEffect, useState } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import { LinerLyrics } from './LinerLyrics'
import { PlaybackDock } from './PlaybackDock'
import {
  PracticeController,
  type PracticeStrategyState,
} from '../practice/practice-controller'
import { useSongEditionPlayback } from './use-song-edition-playback'
import type { RuntimeClient } from '../runtime/runtime-client'
import type { AssembledSongEdition } from '../runtime/song-edition'
import type { SongEditionMode } from './song-edition-mode'

export interface SongEditionPlaybackSurfaceProps {
  model: AssembledSongEdition
  runtimeClient: RuntimeClient
  audioEngine?: AudioEngine
  mode?: SongEditionMode
  onModeChange?: (mode: SongEditionMode) => void
  readingVisible?: boolean
  onToggleReading?: () => void
}

export function SongEditionPlaybackSurface({
  model,
  runtimeClient,
  audioEngine,
  mode: controlledMode,
  onModeChange,
  readingVisible: controlledReadingVisible,
  onToggleReading,
}: SongEditionPlaybackSurfaceProps) {
  const playback = useSongEditionPlayback(model, runtimeClient, audioEngine)
  const [practiceController] = useState(() =>
    playback.engine ? new PracticeController(playback.engine) : null,
  )
  const [practiceState, setPracticeState] = useState<PracticeStrategyState>(
    () => practiceController?.getState() ?? { kind: 'idle' },
  )
  const [internalMode, setInternalMode] = useState<SongEditionMode>('liner')
  const [internalReadingVisible, setInternalReadingVisible] = useState(false)
  const mode = controlledMode ?? internalMode
  const readingVisible = controlledReadingVisible ?? internalReadingVisible
  const changeMode =
    onModeChange ?? ((nextMode: SongEditionMode) => setInternalMode(nextMode))
  const handleModeChange = (nextMode: SongEditionMode): void => {
    if (nextMode !== 'focus') {
      practiceController?.cancel()
    }
    changeMode(nextMode)
  }

  useEffect(() => {
    if (!practiceController) {
      return
    }
    return practiceController.subscribe(setPracticeState)
  }, [practiceController])

  useEffect(() => {
    if (mode !== 'focus') {
      practiceController?.cancel()
    }
  }, [mode, practiceController])

  useEffect(() => {
    practiceController?.cancel()
  }, [model.edition.audio.url, model.edition.song.songId, practiceController])

  useEffect(
    () => () => {
      practiceController?.dispose()
    },
    [practiceController],
  )

  const handleSelectOccurrence = (occurrence: Parameters<
    typeof playback.selectOccurrence
  >[0]): void => {
    practiceController?.cancel()
    playback.selectOccurrence(occurrence)
  }
  const toggleReading =
    onToggleReading ?? (() => setInternalReadingVisible((visible) => !visible))
  const activeOccurrenceIds = new Set(
    playback.resolution.activeOccurrences.map(({ id }) => id),
  )
  const sectionLabel = playback.resolution.currentSection?.label ?? 'Gap'

  return (
    <section
      className={`song-playback-surface${mode === 'focus' ? ' is-focus-mode' : ''}${
        mode === 'immersive' ? ' is-immersive-mode' : ''
      }`}
      aria-label="Song timeline playback"
      data-mode={mode}
      data-engine-active-occurrence-id={
        playback.audioState.activeOccurrenceId
      }
      data-selected-occurrence-id={playback.selectedOccurrenceId}
    >
      {mode === 'focus' ? (
        <FocusPanel
          model={model}
          playback={playback}
          readingVisible={readingVisible}
          onToggleReading={toggleReading}
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
            readingVisible={readingVisible}
            onToggleReading={toggleReading}
            onSelectOccurrence={handleSelectOccurrence}
          />
        </>
      )}
      <PlaybackDock
        model={model}
        playback={playback}
        mode={mode}
        onModeChange={handleModeChange}
        practiceController={practiceController}
        practiceState={practiceState}
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
  const selectedIsInCurrentSection =
    selected?.section.id === playback.resolution.currentSection?.id
  const current =
    primary ??
    (playback.audioState.status !== 'playing' && selectedIsInCurrentSection
      ? selected
      : null)
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
