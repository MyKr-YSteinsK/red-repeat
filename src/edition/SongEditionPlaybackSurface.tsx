import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import { LinerLyrics } from './LinerLyrics'
import { ImmersiveLyrics } from './ImmersiveLyrics'
import { PlaybackDock } from './PlaybackDock'
import {
  PracticeController,
  type PracticeStrategyState,
} from '../practice/practice-controller'
import { useSongEditionPlayback } from './use-song-edition-playback'
import type { RuntimeClient } from '../runtime/runtime-client'
import type { AssembledSongEdition } from '../runtime/song-edition'
import type { SongEditionMode } from './song-edition-mode'
import type { SongEditionKeyboardRegistration } from './song-edition-keyboard'
import type { EditionTheme } from '../theme/theme-preference'

export interface SongEditionPlaybackSurfaceProps {
  model: AssembledSongEdition
  runtimeClient: RuntimeClient
  audioEngine?: AudioEngine
  theme?: EditionTheme
  mode?: SongEditionMode
  onModeChange?: (mode: SongEditionMode) => void
  onRegisterKeyboardActions?: SongEditionKeyboardRegistration
  readingVisible?: boolean
  onToggleReading?: () => void
}

export function SongEditionPlaybackSurface({
  model,
  runtimeClient,
  audioEngine,
  theme: controlledTheme,
  mode: controlledMode,
  onModeChange,
  onRegisterKeyboardActions,
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
  const [controlsVisible, setControlsVisible] = useState(true)
  const controlsHideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const mode = controlledMode ?? internalMode
  const theme = controlledTheme ?? 'liner'
  const readingVisible = controlledReadingVisible ?? internalReadingVisible
  const changeMode =
    onModeChange ?? ((nextMode: SongEditionMode) => setInternalMode(nextMode))
  const handleModeChange = (nextMode: SongEditionMode): void => {
    setControlsVisible(true)
    const engine = playback.engine
    const strategyWasActive = practiceController?.getState().kind !== 'idle'
    const shouldResumeContinuous =
      mode === 'focus' &&
      nextMode !== 'focus' &&
      strategyWasActive &&
      playback.audioState.status === 'playing' &&
      engine !== null
    if (nextMode !== 'focus') {
      practiceController?.cancel()
    }
    if (shouldResumeContinuous) {
      void engine.playContinuous().catch(() => undefined)
    }
    changeMode(nextMode)
  }

  const clearControlsHideTimer = useCallback((): void => {
    if (controlsHideTimer.current !== undefined) {
      clearTimeout(controlsHideTimer.current)
      controlsHideTimer.current = undefined
    }
  }, [])

  const scheduleControlsHide = useCallback((): void => {
    clearControlsHideTimer()
    if (mode !== 'immersive' || playback.audioState.status !== 'playing') {
      setControlsVisible(true)
      return
    }
    controlsHideTimer.current = setTimeout(() => {
      controlsHideTimer.current = undefined
      setControlsVisible(false)
    }, 3000)
  }, [clearControlsHideTimer, mode, playback.audioState.status])

  const revealControls = useCallback((): void => {
    setControlsVisible(true)
    scheduleControlsHide()
  }, [scheduleControlsHide])

  useEffect(() => {
    clearControlsHideTimer()
    if (mode === 'immersive' && playback.audioState.status === 'playing') {
      controlsHideTimer.current = setTimeout(() => {
        controlsHideTimer.current = undefined
        setControlsVisible(false)
      }, 3000)
    }
    return clearControlsHideTimer
  }, [clearControlsHideTimer, mode, playback.audioState.status])

  const effectiveControlsVisible =
    mode !== 'immersive' ||
    playback.audioState.status !== 'playing' ||
    controlsVisible

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
      data-theme={theme}
      data-mode={mode}
      data-controls-hidden={!effectiveControlsVisible}
      onPointerMove={revealControls}
      onTouchStart={revealControls}
      onKeyDown={revealControls}
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
      ) : mode === 'immersive' ? (
        <ImmersiveLyrics model={model} playback={playback} />
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
        controlsVisible={effectiveControlsVisible}
        onRevealControls={revealControls}
        onRegisterKeyboardActions={onRegisterKeyboardActions}
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
