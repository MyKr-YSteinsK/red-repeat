import { useEffect, useState } from 'react'
import {
  findAdjacentOccurrence,
  findNavigationAnchor,
  getLoopRange,
  getLoopScopeLabel,
  LOOP_SCOPES,
  type LoopScope,
} from './playback-controls'
import type { SongEditionPlaybackSnapshot } from './use-song-edition-playback'
import type { AssembledSongEdition } from '../runtime/song-edition'
import type { SongEditionMode } from './song-edition-mode'
import type {
  PracticeController,
  PracticeStrategyState,
} from '../practice/practice-controller'
import type { SongEditionKeyboardRegistration } from './song-edition-keyboard'

export interface PlaybackDockProps {
  model: AssembledSongEdition
  playback: SongEditionPlaybackSnapshot
  mode: SongEditionMode
  onModeChange: (mode: SongEditionMode) => void
  practiceController: PracticeController | null
  practiceState: PracticeStrategyState
  controlsVisible: boolean
  onRevealControls: () => void
  onRegisterKeyboardActions?: SongEditionKeyboardRegistration
}

export function PlaybackDock({
  model,
  playback,
  mode,
  onModeChange,
  practiceController,
  practiceState,
  controlsVisible,
  onRevealControls,
  onRegisterKeyboardActions,
}: PlaybackDockProps) {
  const [loopScope, setLoopScope] = useState<LoopScope>('1')
  const [message, setMessage] = useState<string | undefined>()
  const anchor = findNavigationAnchor(
    model,
    playback.selectedOccurrenceId,
    playback.resolution,
  )
  const previous = findAdjacentOccurrence(
    model,
    'previous',
    playback.selectedOccurrenceId,
    playback.resolution,
  )
  const next = findAdjacentOccurrence(
    model,
    'next',
    playback.selectedOccurrenceId,
    playback.resolution,
  )
  const strategyActive = practiceState.kind !== 'idle'
  const sectionRange = getLoopRange(
    model,
    'section',
    anchor,
    playback.resolution.currentSection,
  )
  const scopeRange = getLoopRange(
    model,
    loopScope,
    anchor,
    playback.resolution.currentSection,
  )

  const playOccurrence = (occurrence: typeof previous): void => {
    if (!occurrence) {
      return
    }
    practiceController?.cancel()
    playback.selectOccurrence(occurrence)
    scrollToOccurrence(occurrence.occurrence.id)
  }

  const playLoop = (scope: LoopScope): void => {
    practiceController?.cancel()
    const range = getLoopRange(
      model,
      scope,
      anchor,
      playback.resolution.currentSection,
    )
    if (!range) {
      setMessage(
        scope === 'section'
          ? 'Section loop unavailable: this Section has no lyric Occurrences.'
          : 'Choose a lyric Occurrence before looping.',
      )
      return
    }
    if (!playback.engine) {
      setMessage('Audio playback is unavailable in this environment.')
      return
    }

    setMessage(undefined)
    void playback.engine
      .playLoop(range, anchor?.occurrence.id)
      .catch(() => setMessage('Playback could not start.'))
  }

  const handleScopeChange = (scope: LoopScope): void => {
    if (strategyActive) {
      return
    }
    setLoopScope(scope)
    if (playback.audioState.intent === 'loop') {
      playLoop(scope)
    }
  }

  const togglePlay = (): void => {
    practiceController?.cancel()
    if (!playback.engine) {
      setMessage('Audio playback is unavailable in this environment.')
      return
    }
    if (playback.audioState.status === 'playing') {
      playback.engine.pause()
      return
    }
    void playback.engine.playContinuous().catch(() => {
      setMessage('Playback could not start.')
    })
  }

  const stepSpeed = (direction: -1 | 1): void => {
    if (strategyActive) {
      return
    }
    if (!playback.engine) {
      return
    }
    const nextRate = Number(
      (playback.audioState.playbackRate + direction * 0.05).toFixed(2),
    )
    try {
      playback.engine.setPlaybackRate(nextRate)
      setMessage(undefined)
    } catch {
      setMessage(
        direction < 0
          ? 'Speed is already at the minimum.'
          : 'Speed is already at the maximum.',
      )
    }
  }

  const setSpeedShortcut = (speed: number): void => {
    if (strategyActive) {
      return
    }
    try {
      playback.engine?.setPlaybackRate(speed)
      setMessage(undefined)
    } catch {
      setMessage('Speed is outside the supported range.')
    }
  }

  useEffect(() => {
    if (!onRegisterKeyboardActions) {
      return
    }

    onRegisterKeyboardActions({
      togglePlay,
      previous: () => playOccurrence(previous),
      next: () => playOccurrence(next),
      toggleLoop: () => playLoop(loopScope),
      decreaseSpeed: () => stepSpeed(-1),
      increaseSpeed: () => stepSpeed(1),
      cancelPractice: () => practiceController?.cancel(),
    })
    return () => onRegisterKeyboardActions(null)
  })

  return (
    <section
      className={`playback-dock${controlsVisible ? '' : ' is-controls-hidden'}`}
      aria-label="Playback controls"
      data-controls-hidden={!controlsVisible}
      onFocus={onRevealControls}
    >
      <div className="dock-main-controls">
        <button
          className="dock-control"
          type="button"
          aria-label="Previous occurrence"
          disabled={!previous}
          onClick={() => playOccurrence(previous)}
        >
          Prev
        </button>
        <button
          className="dock-control dock-play"
          type="button"
          aria-label={playback.audioState.status === 'playing' ? 'Pause' : 'Play'}
          onClick={togglePlay}
        >
          {playback.audioState.status === 'playing' ? 'Pause' : 'Play'}
        </button>
        <button
          className="dock-control"
          type="button"
          aria-label="Next occurrence"
          disabled={!next}
          onClick={() => playOccurrence(next)}
        >
          Next
        </button>
        <button
          className="dock-control dock-focus"
          type="button"
          aria-label={mode === 'focus' ? 'Exit Focus' : 'Focus'}
          aria-pressed={mode === 'focus'}
          onClick={() =>
            onModeChange(mode === 'focus' ? 'liner' : 'focus')
          }
        >
          {mode === 'focus' ? 'Exit Focus' : 'Focus'}
        </button>
        <button
          className="dock-control dock-immersive"
          type="button"
          aria-label={mode === 'immersive' ? 'Exit Immersive' : 'Immersive'}
          aria-pressed={mode === 'immersive'}
          onClick={() =>
            onModeChange(mode === 'immersive' ? 'liner' : 'immersive')
          }
        >
          {mode === 'immersive' ? 'Exit Immersive' : 'Immersive'}
        </button>
      </div>

      {mode !== 'immersive' ? (
        <>
          <div className="dock-loop-controls">
            <button
              className="dock-control"
              type="button"
              aria-label={`Loop ${getLoopScopeLabel(loopScope)}`}
              disabled={!scopeRange || strategyActive}
              onClick={() => playLoop(loopScope)}
            >
              Loop
            </button>
            <div className="loop-scope-group" role="group" aria-label="Loop scope">
              {LOOP_SCOPES.map((scope) => {
                const unavailable =
                  scope === 'section' ? !sectionRange : !anchor
                return (
                  <button
                    className="loop-scope"
                    key={scope}
                    type="button"
                    aria-label={`${getLoopScopeLabel(scope)} loop${
                      unavailable && scope === 'section'
                        ? ': unavailable without lyric Occurrences'
                        : ''
                    }`}
                    aria-pressed={loopScope === scope}
                    disabled={unavailable || strategyActive}
                    onClick={() => handleScopeChange(scope)}
                  >
                    {scope === 'section' ? 'Section' : `${scope} line`}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="dock-speed-controls">
            <span className="dock-speed-label">Speed</span>
            <button
              className="dock-speed-step"
              type="button"
              aria-label="Decrease speed"
              disabled={strategyActive}
              onClick={() => stepSpeed(-1)}
            >
              −
            </button>
            <span className="dock-speed-value" aria-live="polite">
              {playback.audioState.playbackRate.toFixed(2)}x
            </span>
            <button
              className="dock-speed-step"
              type="button"
              aria-label="Increase speed"
              disabled={strategyActive}
              onClick={() => stepSpeed(1)}
            >
              +
            </button>
            <div className="speed-shortcuts" role="group" aria-label="Speed shortcuts">
              {[0.65, 0.75, 0.85, 1].map((speed) => (
                <button
                  className="speed-shortcut"
                  key={speed}
                  type="button"
                  aria-label={`Set speed ${speed.toFixed(2)}x`}
                  aria-pressed={playback.audioState.playbackRate === speed}
                  disabled={strategyActive}
                  onClick={() => setSpeedShortcut(speed)}
                >
                  {speed.toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          {mode === 'focus' ? (
            <div className="dock-practice-controls" aria-label="Practice strategies">
          <button
            className="dock-practice-control"
            type="button"
            aria-label="Ramp"
            aria-pressed={practiceState.kind === 'ramp'}
            disabled={!practiceController || !scopeRange}
            onClick={() => {
              if (practiceState.kind === 'ramp') {
                practiceController?.cancel()
              } else if (scopeRange) {
                practiceController?.startRamp(scopeRange)
              }
            }}
          >
            Ramp
          </button>
          <button
            className="dock-practice-control"
            type="button"
            aria-label="Shadow"
            aria-pressed={practiceState.kind === 'shadow'}
            disabled={!practiceController || !anchor}
            onClick={() => {
              if (practiceState.kind === 'shadow') {
                practiceController?.cancel()
              } else if (anchor) {
                practiceController?.startShadow(anchor.occurrence)
              }
            }}
          >
            Shadow
          </button>
          <p className="dock-practice-status" aria-live="polite">
            {describePracticeState(practiceState)}
          </p>
            </div>
          ) : null}
        </>
      ) : null}

      <p className="dock-message" aria-live="polite">
        {message ?? `${playback.audioState.playbackRate.toFixed(2)}x / ${getLoopScopeLabel(loopScope)}`}
      </p>
    </section>
  )
}

function describePracticeState(state: PracticeStrategyState): string {
  if (state.kind === 'idle') {
    return 'Practice idle'
  }
  if (state.kind === 'ramp') {
    return `RAMP · ${state.stageSpeed.toFixed(2)}x · ${
      state.repetitionIndex + 1
    }/${2}`
  }
  if (state.phase === 'your-turn') {
    return `YOUR TURN · ${Math.round(state.silenceDurationMs / 1000)}s`
  }
  return state.phase === 'source-before' ? 'LISTEN' : 'LISTEN AGAIN'
}

function scrollToOccurrence(occurrenceId: string): void {
  const element = document.querySelector(
    `[data-occurrence-id="${occurrenceId}"]`,
  )
  if (!element || typeof element.scrollIntoView !== 'function') {
    return
  }
  const reducedMotion = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches
  element.scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'center',
  })
}
