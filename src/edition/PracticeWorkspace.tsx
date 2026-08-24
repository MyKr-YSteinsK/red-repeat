import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  const [mapOpen, setMapOpen] = useState(false)
  const [message, setMessage] = useState<string>()
  const operationRef = useRef(0)
  const mapNavRef = useRef<HTMLElement | null>(null)
  const mapItemRefs = useRef(new Map<string, HTMLLIElement>())

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

  const selectUnit = useCallback(
    (practiceUnitId: string): void => {
      const nextState = focusPracticeUnitStart(
        learningState,
        practiceIndex,
        practiceUnitId,
      )
      persistLearningState(nextState)
      setMessage(undefined)
    },
    [learningState, persistLearningState, practiceIndex],
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
        selectUnit(requestedPracticeUnitId)
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
    selectUnit,
  ])

  useEffect(() => {
    if (!mapOpen || !currentUnit) {
      return
    }
    const timeoutId = globalThis.setTimeout(() => {
      const nav = mapNavRef.current
      const item = mapItemRefs.current.get(currentUnit.id)
      if (nav && item) {
        revealPracticeMapItem(nav, item)
      }
    }, 0)
    return () => globalThis.clearTimeout(timeoutId)
  }, [currentUnit, mapOpen])

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
      cancelPlayback()
      selectUnit(nextUnit.id)
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
  const currentOccurrenceIndex = currentUnitOccurrences.findIndex(
    ({ occurrence }) => occurrence.id === currentOccurrence.occurrence.id,
  )
  const unitIndex = practiceIndex.units.findIndex(({ id }) => id === currentUnit.id)

  return (
    <section
      className="practice-workspace"
      aria-label="学唱工作台"
      data-current-unit-id={currentUnit.id}
      data-current-occurrence-id={currentOccurrence.occurrence.id}
      data-continuous-playback={continuousPlayback}
      data-ramp-practice={rampPractice}
    >
      <div className="practice-layout">
        <div className="practice-lyrics-column">
          <section className="practice-lyrics" aria-labelledby="practice-unit-title">
            <header className="practice-unit-heading">
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
                  isCurrent={assembledOccurrence.occurrence.id === currentOccurrence.occurrence.id}
                  onPlay={() => handleOccurrenceClick(assembledOccurrence.occurrence.id)}
                />
              ))}
            </ol>
          </section>
        </div>

        <details
          className="practice-map"
          open={mapOpen}
          onToggle={(event) => setMapOpen(event.currentTarget.open)}
        >
          <summary aria-label={`歌曲地图，${String(unitIndex + 1).padStart(2, '0')} / ${String(practiceIndex.units.length).padStart(2, '0')}，${currentUnit.label}`}>
            <span>歌曲地图</span>
            <span className="practice-map-current">
              {String(unitIndex + 1).padStart(2, '0')} / {String(practiceIndex.units.length).padStart(2, '0')} · {currentUnit.label}
            </span>
            <span className="practice-map-toggle">{mapOpen ? '收起' : '展开'}</span>
          </summary>
          <nav ref={mapNavRef} aria-label="学习段" data-practice-map-scroll="true">
            <ol>
              {practiceIndex.units.map((unit, index) => {
                const isCurrent = unit.id === currentUnit.id
                return (
                  <li
                    key={unit.id}
                    ref={(element) => {
                      if (element) {
                        mapItemRefs.current.set(unit.id, element)
                      } else {
                        mapItemRefs.current.delete(unit.id)
                      }
                    }}
                  >
                    <button
                      className={`practice-unit-link${isCurrent ? ' is-current' : ''}`}
                      type="button"
                      aria-current={isCurrent ? 'step' : undefined}
                      onClick={() => {
                        cancelPlayback()
                        selectUnit(unit.id)
                      }}
                    >
                      <span className="practice-unit-number">{String(index + 1).padStart(2, '0')}</span>
                      <span className="practice-unit-label">{unit.label}</span>
                      <span className="practice-unit-state">{isCurrent ? '当前' : ''}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>
        </details>
      </div>

      <aside className="control-sheet practice-controls practice-dock" aria-label="练习控制">
        <div className="practice-dock-topline">
          <button
            className="control-button control-button--quiet practice-action practice-context-navigation"
            type="button"
            aria-label="上一段"
            onClick={() => changeUnit('previous')}
            disabled={!getAdjacentPracticeUnit(practiceIndex, currentUnit.id, 'previous')}
          >
            ← 上一段
          </button>
          <span className="practice-dock-context">
            <span>{currentUnit.label}</span>
            <span>{currentOccurrenceIndex + 1} / {currentUnitOccurrences.length} 句</span>
          </span>
          <button
            className="control-button control-button--quiet practice-action practice-context-navigation"
            type="button"
            aria-label="下一段"
            onClick={() => changeUnit('next')}
            disabled={!getAdjacentPracticeUnit(practiceIndex, currentUnit.id, 'next')}
          >
            下一段 →
          </button>
        </div>
        <div className="practice-dock-primary">
          <button
            className="control-button control-button--primary control-button--lg practice-action practice-play-button"
            type="button"
            onClick={togglePlayback}
            disabled={!playback.engine}
          >
            {playback.audioState.status === 'playing' ? '暂停' : '播放'}
          </button>
          <div className="practice-rate-actions" aria-label="播放速度">
            {PRACTICE_SPEEDS.map((speed) => (
              <button
                key={speed}
                className="control-button control-button--sm control-button--toggle practice-action"
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
        </div>
        <div className="practice-dock-modes">
          <button
            className="control-button control-button--toggle practice-action"
            type="button"
            aria-pressed={continuousPlayback}
            onClick={() => setContinuousPlayback((value) => !value)}
          >
            连续播放
          </button>
          <button
            className="control-button control-button--toggle practice-action"
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
      <button
        className="practice-original"
        type="button"
        onClick={onPlay}
        aria-label={`播放第 ${String(lyricNumber).padStart(2, '0')} 句`}
      >
        {segment.lyrics}
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

function revealPracticeMapItem(container: HTMLElement, item: HTMLElement): void {
  if (container.clientHeight <= 0) {
    return
  }

  const containerRect = container.getBoundingClientRect()
  const itemRect = item.getBoundingClientRect()
  const inset = Math.min(18, Math.max(10, container.clientHeight * 0.12))
  const visibleTop = containerRect.top + inset
  const visibleBottom = getPracticeMapVisibleBottom(containerRect, inset)

  if (visibleBottom <= visibleTop) {
    return
  }

  if (itemRect.top < visibleTop) {
    container.scrollTop = Math.max(
      0,
      container.scrollTop + itemRect.top - visibleTop,
    )
    return
  }

  if (itemRect.bottom > visibleBottom) {
    container.scrollTop = Math.max(
      0,
      container.scrollTop + itemRect.bottom - visibleBottom,
    )
  }
}

function getPracticeMapVisibleBottom(
  containerRect: DOMRect,
  inset: number,
): number {
  const defaultBottom = containerRect.bottom - inset
  const dock = document.querySelector<HTMLElement>('.practice-dock')
  if (!dock || window.getComputedStyle(dock).position !== 'fixed') {
    return defaultBottom
  }

  const dockRect = dock.getBoundingClientRect()
  if (dockRect.top <= containerRect.top || dockRect.top >= defaultBottom) {
    return defaultBottom
  }
  return dockRect.top - inset
}
