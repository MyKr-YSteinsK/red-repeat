import { useState } from 'react'
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

export interface PlaybackDockProps {
  model: AssembledSongEdition
  playback: SongEditionPlaybackSnapshot
  focusMode: boolean
  onToggleFocus: () => void
}

export function PlaybackDock({
  model,
  playback,
  focusMode,
  onToggleFocus,
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
    playback.selectOccurrence(occurrence)
    scrollToOccurrence(occurrence.occurrence.id)
  }

  const playLoop = (scope: LoopScope): void => {
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
    setLoopScope(scope)
    if (playback.audioState.intent === 'loop') {
      playLoop(scope)
    }
  }

  const togglePlay = (): void => {
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
    try {
      playback.engine?.setPlaybackRate(speed)
      setMessage(undefined)
    } catch {
      setMessage('Speed is outside the supported range.')
    }
  }

  return (
    <section className="playback-dock" aria-label="Playback controls">
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
          aria-label={focusMode ? 'Exit Focus' : 'Focus'}
          aria-pressed={focusMode}
          onClick={onToggleFocus}
        >
          {focusMode ? 'Exit Focus' : 'Focus'}
        </button>
      </div>

      <div className="dock-loop-controls">
        <button
          className="dock-control"
          type="button"
          aria-label={`Loop ${getLoopScopeLabel(loopScope)}`}
          disabled={!scopeRange}
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
                disabled={unavailable}
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
              onClick={() => setSpeedShortcut(speed)}
            >
              {speed.toFixed(2)}
            </button>
          ))}
        </div>
      </div>

      <p className="dock-message" aria-live="polite">
        {message ?? `${playback.audioState.playbackRate.toFixed(2)}x / ${getLoopScopeLabel(loopScope)}`}
      </p>
    </section>
  )
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
