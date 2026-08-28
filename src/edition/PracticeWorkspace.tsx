import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import type { RuntimeClient } from '../runtime/runtime-client'
import type {
  AssembledOccurrence,
  AssembledSongEdition,
} from '../runtime/song-edition'
import {
  createPracticeIndex,
  getAdjacentPracticeUnit,
  resolvePracticeRange,
  resolvePracticeUnitRangeFromOccurrence,
  type PracticeIndex,
} from '../practice/practice-scope'
import {
  createInitialPracticeState,
  focusPracticeUnitStart,
  loadPracticeLearningState,
  savePracticeLearningState,
  setCurrentPracticeOccurrence,
  type PracticeLearningState,
} from '../practice/practice-state'
import {
  readPracticePlaybackRate,
  savePracticePlaybackRate,
} from '../practice/practice-rate'
import {
  restoreScrollPolicy,
} from '../navigation/stable-context-transition'
import { PracticeSegmentPicker } from './PracticeSegmentPicker'
import { LyricText } from './LyricText'
import { useSongEditionPlayback } from './use-song-edition-playback'

const PRACTICE_SPEEDS = [0.6, 0.8, 1] as const
type PracticeSpeed = (typeof PRACTICE_SPEEDS)[number]

export interface PracticeWorkspaceProps {
  model: AssembledSongEdition
  runtimeClient: RuntimeClient
  audioEngine?: AudioEngine
  requestedPracticeUnitId?: string
  onRequestedPracticeUnitConsumed?: () => void
}

export function PracticeWorkspace({
  model,
  runtimeClient,
  audioEngine,
  requestedPracticeUnitId,
  onRequestedPracticeUnitConsumed,
}: PracticeWorkspaceProps) {
  const playback = useSongEditionPlayback(model, runtimeClient, audioEngine)
  const practiceIndex = useMemo(
    () => createPracticeIndex(model.practice, model.timeline),
    [model.practice, model.timeline],
  )
  const [learningState, setLearningState] = useState<PracticeLearningState>(() =>
    loadSafeLearningState(model, practiceIndex),
  )
  const [continuousPlayback, setContinuousPlayback] = useState(false)
  const [rampPractice, setRampPractice] = useState(false)
  const [playbackRate, setPlaybackRate] = useState<PracticeSpeed>(() =>
    normalizePracticeSpeed(readPracticePlaybackRate(model.edition.song.songId)),
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [message, setMessage] = useState<string>()
  const operationRef = useRef(0)
  const workspaceRef = useRef<HTMLElement | null>(null)
  const dockRef = useRef<HTMLElement | null>(null)
  const lyricsAnchorRef = useRef<HTMLElement | null>(null)
  const pendingNavigationRef = useRef(false)

  const currentUnit =
    practiceIndex.unitsById.get(learningState.practiceUnitId) ??
    practiceIndex.units[0]
  const currentOccurrence = currentUnit
    ? model.occurrencesById[learningState.currentOccurrenceId] ??
      model.occurrencesById[currentUnit.occurrenceIds[0]]
    : undefined

  const cancelPlayback = useCallback((): void => {
    operationRef.current += 1
    playback.engine?.pause()
  }, [playback.engine])

  const persistLearningState = useCallback(
    (nextState: PracticeLearningState): void => {
      setLearningState(nextState)
      savePracticeLearningState(model.edition.song.songId, nextState)
    },
    [model.edition.song.songId],
  )

  const selectOccurrence = useCallback(
    (occurrenceId: string): void => {
      const nextState = setCurrentPracticeOccurrence(
        learningState,
        practiceIndex,
        occurrenceId,
      )
      persistLearningState(nextState)
    },
    [learningState, persistLearningState, practiceIndex],
  )

  const navigatePracticeUnit = useCallback(
    (practiceUnitId: string): void => {
      if (practiceUnitId === learningState.practiceUnitId) {
        setPickerOpen(false)
        return
      }
      cancelPlayback()
      pendingNavigationRef.current = true
      const nextState = focusPracticeUnitStart(
        learningState,
        practiceIndex,
        practiceUnitId,
      )
      persistLearningState(nextState)
      setPickerOpen(false)
      setMessage(undefined)
    },
    [cancelPlayback, learningState, persistLearningState, practiceIndex],
  )

  useEffect(() => {
    if (
      !requestedPracticeUnitId ||
      requestedPracticeUnitId === learningState.practiceUnitId
    ) {
      return
    }
    if (practiceIndex.unitsById.has(requestedPracticeUnitId)) {
      const timeoutId = globalThis.setTimeout(() => {
        navigatePracticeUnit(requestedPracticeUnitId)
        onRequestedPracticeUnitConsumed?.()
      }, 0)
      return () => globalThis.clearTimeout(timeoutId)
    }
    onRequestedPracticeUnitConsumed?.()
  }, [
    learningState.practiceUnitId,
    onRequestedPracticeUnitConsumed,
    practiceIndex.unitsById,
    requestedPracticeUnitId,
    navigatePracticeUnit,
  ])

  useLayoutEffect(() => {
    if (!pendingNavigationRef.current) {
      return
    }
    pendingNavigationRef.current = false
    restoreScrollPolicy(
      'reveal-content-start',
      undefined,
      lyricsAnchorRef.current,
      96,
    )
  }, [learningState.practiceUnitId])

  useLayoutEffect(() => {
    const workspace = workspaceRef.current
    const dock = dockRef.current
    if (!workspace || !dock) {
      return
    }

    const updateDockOcclusion = (): void => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const dockRect = dock.getBoundingClientRect()
      const bottomOffset = Math.max(0, viewportHeight - dockRect.bottom)
      const occlusion = Math.max(0, dockRect.height + bottomOffset)
      workspace.style.setProperty(
        '--practice-dock-occlusion',
        `${Math.ceil(occlusion)}px`,
      )
    }

    updateDockOcclusion()
    const resizeObserver =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(updateDockOcclusion)
        : undefined
    resizeObserver?.observe(dock)
    window.addEventListener('resize', updateDockOcclusion)
    window.visualViewport?.addEventListener('resize', updateDockOcclusion)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateDockOcclusion)
      window.visualViewport?.removeEventListener('resize', updateDockOcclusion)
    }
  }, [])

  useEffect(() => {
    if (!playback.engine) {
      return
    }
    try {
      playback.engine.setPlaybackRate(playbackRate)
    } catch {
      playback.engine.setPlaybackRate(1)
    }
  }, [playback.engine, playbackRate])

  useEffect(() => () => cancelPlayback(), [cancelPlayback])

  const playSelection = useCallback(
    async (occurrenceId: string): Promise<void> => {
      if (!playback.engine) {
        setMessage('当前环境无法播放音频。')
        return
      }

      const unitId = practiceIndex.unitIdByOccurrenceId.get(occurrenceId)
      const unit = unitId ? practiceIndex.unitsById.get(unitId) : undefined
      if (!unit) {
        setMessage('当前歌词还没有可用的练习段。')
        return
      }

      const range = continuousPlayback
        ? resolvePracticeUnitRangeFromOccurrence(
            unit.id,
            occurrenceId,
            model.practice,
            model.timeline,
            model.timingProvider,
          )
        : resolvePracticeRange(
            { kind: 'currentOccurrence', occurrenceId },
            model.practice,
            model.timeline,
            model.timingProvider,
          )
      const token = ++operationRef.current
      setMessage(undefined)

      const rates: readonly number[] = rampPractice
        ? PRACTICE_SPEEDS
        : [playbackRate]
      for (const rate of rates) {
        if (token !== operationRef.current) {
          return
        }
        playback.engine.setPlaybackRate(rate)
        const completion = await playback.engine.playRangeUntilComplete(
          range,
          occurrenceId,
        )
        if (completion.status !== 'completed') {
          if (completion.status === 'errored') {
            setMessage(completion.error.message)
          }
          return
        }
      }
      if (token === operationRef.current) {
        playback.engine.setPlaybackRate(playbackRate)
      }
    },
    [
      continuousPlayback,
      model.practice,
      model.timeline,
      model.timingProvider,
      playback.engine,
      practiceIndex,
      playbackRate,
      rampPractice,
    ],
  )

  const handleOccurrenceClick = (occurrenceId: string): void => {
    selectOccurrence(occurrenceId)
    void playSelection(occurrenceId)
  }

  const togglePlayback = (): void => {
    if (!currentOccurrence) {
      return
    }
    if (playback.audioState.status === 'playing') {
      cancelPlayback()
      return
    }
    void playSelection(currentOccurrence.occurrence.id)
  }

  const changeUnit = (direction: 'previous' | 'next'): void => {
    if (!currentUnit) {
      return
    }
    const nextUnit = getAdjacentPracticeUnit(practiceIndex, currentUnit.id, direction)
    if (nextUnit) {
      navigatePracticeUnit(nextUnit.id)
    }
  }

  const setSpeed = (nextSpeed: PracticeSpeed): void => {
    setPlaybackRate(nextSpeed)
    savePracticePlaybackRate(model.edition.song.songId, nextSpeed)
  }

  if (!currentUnit || !currentOccurrence) {
    return (
      <section className="practice-workspace" aria-label="学唱工作台">
        <p className="empty-kicker">学唱</p>
        <h2>这首歌暂时没有可练习的歌词。</h2>
      </section>
    )
  }

  const currentUnitOccurrences = currentUnit.occurrenceIds
    .map((occurrenceId) => model.occurrencesById[occurrenceId])
    .filter((occurrence): occurrence is AssembledOccurrence => Boolean(occurrence))
  const followsPlayback =
    (continuousPlayback || rampPractice) && playback.audioState.status === 'playing'
  const primaryOccurrenceId = playback.resolution.primaryOccurrence?.id
  const audibleCurrentOccurrenceId =
    followsPlayback &&
    primaryOccurrenceId &&
    currentUnit.occurrenceIds.includes(primaryOccurrenceId)
      ? primaryOccurrenceId
      : undefined
  const visibleCurrentOccurrenceId =
    audibleCurrentOccurrenceId ?? currentOccurrence.occurrence.id
  const currentOccurrenceIndex = currentUnitOccurrences.findIndex(
    ({ occurrence }) => occurrence.id === currentOccurrence.occurrence.id,
  )
  const unitIndex = practiceIndex.units.findIndex(({ id }) => id === currentUnit.id)

  return (
    <section
      ref={workspaceRef}
      className="practice-workspace"
      aria-label="学唱工作台"
      data-current-unit-id={currentUnit.id}
      data-current-occurrence-id={visibleCurrentOccurrenceId}
      data-audible-occurrence-id={audibleCurrentOccurrenceId}
      data-continuous-playback={continuousPlayback}
      data-ramp-practice={rampPractice}
    >
      <div className="practice-layout">
        <div className="practice-lyrics-column">
          <section className="practice-lyrics" aria-labelledby="practice-unit-title">
            <header className="practice-unit-heading" ref={lyricsAnchorRef}>
              <div>
                <p className="eyebrow">当前学习段 / {String(unitIndex + 1).padStart(2, '0')}</p>
                <h2 id="practice-unit-title">{currentUnit.label}</h2>
              </div>
              <p className="practice-unit-count">
                {currentOccurrenceIndex + 1} / {currentUnitOccurrences.length} 句
              </p>
            </header>
            <ol className="practice-lyric-list">
              {currentUnitOccurrences.map((assembledOccurrence, index) => (
                <PracticeLyricRow
                  key={assembledOccurrence.occurrence.id}
                  assembledOccurrence={assembledOccurrence}
                  lyricNumber={index + 1}
                  isCurrent={assembledOccurrence.occurrence.id === visibleCurrentOccurrenceId}
                  onPlay={() => handleOccurrenceClick(assembledOccurrence.occurrence.id)}
                />
              ))}
            </ol>
          </section>
        </div>

      </div>

      <aside ref={dockRef} className="practice-controls practice-dock" aria-label="练习控制">
        <div className="practice-dock-topline">
          <button
            className="practice-player-button practice-context-navigation"
            type="button"
            aria-label="上一段"
            onClick={() => changeUnit('previous')}
            disabled={!getAdjacentPracticeUnit(practiceIndex, currentUnit.id, 'previous')}
          >
            ← 上一段
          </button>
          <button
            className="practice-dock-context"
            type="button"
            aria-label={`选择学习段：${currentUnit.label}`}
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen(true)}
          >
            <span>{currentUnit.label}</span>
            <span>{currentOccurrenceIndex + 1} / {currentUnitOccurrences.length} 句</span>
            <span className="practice-dock-context-chevron" aria-hidden="true">⌃</span>
          </button>
          <button
            className="practice-player-button practice-context-navigation"
            type="button"
            aria-label="下一段"
            onClick={() => changeUnit('next')}
            disabled={!getAdjacentPracticeUnit(practiceIndex, currentUnit.id, 'next')}
          >
            下一段 →
          </button>
        </div>
        <div className="practice-dock-primary">
          <div className="practice-rate-actions" aria-label="播放速度">
            {PRACTICE_SPEEDS.map((speed) => (
              <button
                key={speed}
                className="practice-player-button practice-speed-button"
                type="button"
                aria-pressed={playbackRate === speed}
                aria-describedby="practice-ramp-explanation"
                data-ramp-active={rampPractice ? 'true' : 'false'}
                onClick={() => setSpeed(speed)}
              >
                {speed.toFixed(2)}x
              </button>
            ))}
          </div>
          <button
            className="practice-player-button practice-play-button"
            type="button"
            onClick={togglePlayback}
            disabled={!playback.engine}
          >
            {playback.audioState.status === 'playing' ? '暂停' : '播放'}
          </button>
        </div>
        <div className="practice-dock-modes">
          <button
            className="practice-player-button practice-mode-button"
            type="button"
            aria-pressed={continuousPlayback}
            onClick={() => setContinuousPlayback((value) => !value)}
          >
            连续播放
          </button>
          <button
            className="practice-player-button practice-mode-button"
            type="button"
            aria-pressed={rampPractice}
            aria-describedby="practice-ramp-explanation"
            onClick={() => setRampPractice((value) => !value)}
          >
            渐速练习
          </button>
        </div>
        <p id="practice-ramp-explanation" className="practice-sr-only">
          开启渐速练习时，播放会按 0.60x、0.80x、1.00x 依次进行；速度按钮仍可设置关闭渐速后的播放速度。
        </p>
        {message ? <p className="practice-message" role="status">{message}</p> : null}
      </aside>
      <PracticeSegmentPicker
        units={practiceIndex.units}
        currentUnitId={currentUnit.id}
        open={pickerOpen}
        onSelect={navigatePracticeUnit}
        onClose={() => setPickerOpen(false)}
      />
    </section>
  )
}

function PracticeLyricRow({
  assembledOccurrence,
  lyricNumber,
  isCurrent,
  onPlay,
}: {
  assembledOccurrence: AssembledOccurrence
  lyricNumber: number
  isCurrent: boolean
  onPlay: () => void
}) {
  const { occurrence, segment } = assembledOccurrence
  return (
    <li
      className={`practice-lyric-row${isCurrent ? ' is-current' : ''}`}
      data-occurrence-id={occurrence.id}
    >
      <div className="practice-lyric-cluster">
        <button
          className="practice-original"
          type="button"
          onClick={onPlay}
          aria-label={`播放第 ${String(lyricNumber).padStart(2, '0')} 句`}
        >
          <LyricText segment={segment} />
        </button>
        <p className="practice-translation">{segment.translation}</p>
        {segment.layers?.length ? (
          <div className="practice-readings" aria-label="读音">
            {segment.layers.map((layer) => (
              <p key={layer.id}>
                <span>{layer.label}</span> {layer.text}
              </p>
            ))}
          </div>
        ) : null}
        {segment.notes?.length ? (
          <details className="practice-note">
            <summary>查看提示</summary>
            <div>
              {segment.notes.map((note, index) => (
                <p key={`${note.title ?? 'note'}-${index}`}>
                  {note.title ? <strong>{note.title}</strong> : null}
                  {note.body}
                </p>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </li>
  )
}

function loadSafeLearningState(
  model: AssembledSongEdition,
  practiceIndex: PracticeIndex,
): PracticeLearningState {
  if (practiceIndex.units.length === 0) {
    return {
      schemaVersion: 1,
      practiceUnitId: '',
      currentOccurrenceId: '',
      coveredUntilByUnit: {},
    }
  }
  try {
    return loadPracticeLearningState(
      model.edition.song.songId,
      model.practice,
      model.timeline,
    )
  } catch {
    return createInitialPracticeState(practiceIndex)
  }
}

function normalizePracticeSpeed(value: number): PracticeSpeed {
  return PRACTICE_SPEEDS.includes(value as PracticeSpeed)
    ? (value as PracticeSpeed)
    : 1
}
