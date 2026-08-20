import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import type { RuntimeClient } from '../runtime/runtime-client'
import type { AssembledOccurrence, AssembledSongEdition } from '../runtime/song-edition'
import {
  createPracticeIndex,
  getAdjacentPracticeOccurrence,
  getAdjacentPracticeUnit,
  resolvePracticeRange,
  type PracticeIndex,
  type PracticeScope,
  type ResolvedPracticeRange,
} from '../practice/practice-scope'
import {
  createInitialPracticeState,
  loadPracticeLearningState,
  savePracticeLearningState,
  setCurrentPracticeOccurrence,
  type PracticeLearningState,
} from '../practice/practice-state'
import { useSongEditionPlayback } from './use-song-edition-playback'
import type { EditionTheme } from '../theme/theme-preference'

export interface PracticeWorkspaceProps {
  model: AssembledSongEdition
  runtimeClient: RuntimeClient
  audioEngine?: AudioEngine
  theme: EditionTheme
}

export function PracticeWorkspace({
  model,
  runtimeClient,
  audioEngine,
  theme,
}: PracticeWorkspaceProps) {
  const playback = useSongEditionPlayback(model, runtimeClient, audioEngine)
  const practiceIndex = useMemo(
    () => createPracticeIndex(model.practice, model.timeline),
    [model.practice, model.timeline],
  )
  const [learningState, setLearningState] = useState<PracticeLearningState | null>(
    () => loadSafeState(model, practiceIndex),
  )
  const [mapOpen, setMapOpen] = useState(getInitialPracticeMapOpen)
  const [playbackSession, setPlaybackSession] =
    useState<PracticePlaybackSession | null>(null)
  const [message, setMessage] = useState<string | undefined>()

  useEffect(() => {
    if (learningState) {
      savePracticeLearningState(model.edition.song.songId, learningState)
    }
  }, [learningState, model.edition.song.songId])

  const setOccurrence = useCallback(
    (occurrenceId: string): void => {
      setLearningState((current) =>
        current
          ? setCurrentPracticeOccurrence(current, practiceIndex, occurrenceId)
          : current,
      )
    },
    [practiceIndex],
  )

  const playScope = useCallback(
    (scope: PracticeScope, activeOccurrenceId?: string): void => {
      if (!playback.engine) {
        setMessage('当前环境无法播放音频。')
        return
      }

      try {
        const range = resolvePracticeRange(
          scope,
          model.practice,
          model.timeline,
        )
        setPlaybackSession({
          range,
          activeOccurrenceId,
        })
        setMessage(undefined)
        void playback.engine
          .playRange(range, activeOccurrenceId)
          .catch(() => {
            setPlaybackSession(null)
            setMessage('播放未能开始。')
          })
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '练习范围无效。')
      }
    },
    [model.practice, model.timeline, playback.engine],
  )

  const playOccurrence = useCallback(
    (occurrenceId: string): void => {
      setOccurrence(occurrenceId)
      playScope({ kind: 'currentOccurrence', occurrenceId }, occurrenceId)
    },
    [playScope, setOccurrence],
  )

  const navigateOccurrence = useCallback(
    (direction: 'previous' | 'next'): void => {
      if (!learningState) {
        return
      }
      const occurrenceId = getAdjacentPracticeOccurrence(
        practiceIndex,
        learningState.practiceUnitId,
        learningState.currentOccurrenceId,
        direction,
      )
      if (occurrenceId) {
        playOccurrence(occurrenceId)
      }
    },
    [learningState, playOccurrence, practiceIndex],
  )

  const navigateUnit = useCallback(
    (direction: 'previous' | 'next'): void => {
      if (!learningState) {
        return
      }
      const unit = getAdjacentPracticeUnit(
        practiceIndex,
        learningState.practiceUnitId,
        direction,
      )
      const firstOccurrenceId = unit?.occurrenceIds[0]
      if (firstOccurrenceId) {
        setPlaybackSession(null)
        setOccurrence(firstOccurrenceId)
        setMessage(undefined)
      }
    },
    [learningState, practiceIndex, setOccurrence],
  )

  const togglePlayback = useCallback((): void => {
    if (!playback.engine || !learningState) {
      setMessage('当前环境无法播放音频。')
      return
    }
    if (playback.audioState.status === 'playing') {
      playback.engine.pause()
      const session = playbackSession
      if (session) {
        const pausedAtMs = playback.engine.getState().currentTimeMs
        setPlaybackSession(
          isResumablePosition(session.range, pausedAtMs)
            ? { ...session, resumableAtMs: pausedAtMs }
            : null,
        )
      }
      return
    }

    const session = playbackSession
    if (session?.resumableAtMs !== undefined) {
      const resumeStartMs = session.resumableAtMs
      setPlaybackSession({
        ...session,
        resumableAtMs: undefined,
      })
      void playback.engine
        .playRange(
          {
            ...session.range,
            startMs: resumeStartMs,
          },
          session.activeOccurrenceId,
        )
        .catch(() => {
          setPlaybackSession(null)
          setMessage('播放未能开始。')
        })
      return
    }

    playOccurrence(learningState.currentOccurrenceId)
  }, [learningState, playOccurrence, playback.audioState.status, playback.engine, playbackSession])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditableTarget(event.target)
      ) {
        return
      }

      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault()
        togglePlayback()
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        navigateOccurrence('previous')
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        navigateOccurrence('next')
      } else if (event.key === 'Enter' && learningState) {
        event.preventDefault()
        playOccurrence(learningState.currentOccurrenceId)
      } else if (event.key === 'PageUp') {
        event.preventDefault()
        navigateUnit('previous')
      } else if (event.key === 'PageDown') {
        event.preventDefault()
        navigateUnit('next')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [learningState, navigateOccurrence, navigateUnit, playOccurrence, togglePlayback])

  if (!learningState || practiceIndex.units.length === 0) {
    return (
      <section className="practice-empty" aria-label="学唱">
        <p className="eyebrow">学唱</p>
        <h2>这首歌还没有可用的学习段。</h2>
        <p>请先为所有歌词 Occurrence 建立 Practice Unit。</p>
      </section>
    )
  }

  const currentUnit = practiceIndex.unitsById.get(learningState.practiceUnitId)
  const currentOccurrence = model.occurrencesById[learningState.currentOccurrenceId]
  if (!currentUnit || !currentOccurrence) {
    return null
  }

  const unitIndex = practiceIndex.units.findIndex(({ id }) => id === currentUnit.id)
  const currentUnitOccurrences = currentUnit.occurrenceIds
    .map((occurrenceId) => model.occurrencesById[occurrenceId])
    .filter((occurrence): occurrence is AssembledOccurrence => Boolean(occurrence))
  const contextOccurrences = currentUnitOccurrences.filter(
    ({ occurrence }) => occurrence.id !== currentOccurrence.occurrence.id,
  )
  const coveredUntilOccurrenceId = learningState.coveredUntilByUnit[currentUnit.id]
  const previousUnit = getAdjacentPracticeUnit(practiceIndex, currentUnit.id, 'previous')
  const nextUnit = getAdjacentPracticeUnit(practiceIndex, currentUnit.id, 'next')
  const previousOccurrence = getAdjacentPracticeOccurrence(
    practiceIndex,
    currentUnit.id,
    currentOccurrence.occurrence.id,
    'previous',
  )
  const nextOccurrence = getAdjacentPracticeOccurrence(
    practiceIndex,
    currentUnit.id,
    currentOccurrence.occurrence.id,
    'next',
  )
  const resumableSession = playbackSession
  const canResume =
    resumableSession?.resumableAtMs !== undefined &&
    isResumablePosition(resumableSession.range, resumableSession.resumableAtMs)

  return (
    <section
      className="practice-workspace"
      aria-label="学唱工作台"
      data-theme={theme}
      data-current-unit-id={currentUnit.id}
      data-current-occurrence-id={currentOccurrence.occurrence.id}
    >
      <div className="practice-layout">
        <section className="practice-lyrics" aria-labelledby="practice-unit-title">
          <header className="practice-unit-heading">
            <div>
              <p className="eyebrow">当前学习段 / {String(unitIndex + 1).padStart(2, '0')}</p>
              <h2 id="practice-unit-title">{currentUnit.label}</h2>
            </div>
            <p className="practice-unit-count">
              {currentUnitOccurrences.findIndex(
                ({ occurrence }) => occurrence.id === currentOccurrence.occurrence.id,
              ) + 1}{' '}
              / {currentUnitOccurrences.length} 句
            </p>
          </header>
          <ol className="practice-current-lyric">
            <PracticeLyricRow
              assembledOccurrence={currentOccurrence}
              isCurrent
              onPlay={() => playOccurrence(currentOccurrence.occurrence.id)}
            />
          </ol>
        </section>

        <aside className="practice-controls" aria-label="练习控制">
          <p className="practice-control-kicker">练习控制</p>
          <p className="practice-current-label">
            当前：{currentOccurrence.occurrence.id} · {currentOccurrence.segment.lyrics}
          </p>
          <div className="practice-primary-actions">
            <button
              className="practice-action practice-action-primary"
              type="button"
              onClick={() => playOccurrence(currentOccurrence.occurrence.id)}
              disabled={!playback.engine}
            >
              再听这句
            </button>
            <button
              className="practice-action"
              type="button"
              onClick={togglePlayback}
              disabled={!playback.engine}
            >
              {playback.audioState.status === 'playing'
                ? '暂停'
                : canResume
                  ? '继续'
                  : '播放'}
            </button>
          </div>
          <div className="practice-adjacent-actions">
            <button
              className="practice-action"
              type="button"
              onClick={() => navigateOccurrence('previous')}
              disabled={!previousOccurrence}
            >
              ↑ 上一句
            </button>
            <button
              className="practice-action"
              type="button"
              onClick={() => navigateOccurrence('next')}
              disabled={!nextOccurrence}
            >
              ↓ 下一句
            </button>
          </div>
          <div className="practice-range-actions">
            <button
              className="practice-action"
              type="button"
              onClick={() =>
                playScope(
                  {
                    kind: 'coveredRange',
                    practiceUnitId: currentUnit.id,
                    endOccurrenceId: coveredUntilOccurrenceId,
                  },
                  coveredUntilOccurrenceId,
                )
              }
              disabled={!coveredUntilOccurrenceId || !playback.engine}
            >
              已学到这里 · 连续播放
            </button>
            <button
              className="practice-action"
              type="button"
              onClick={() =>
                playScope(
                  { kind: 'practiceUnit', practiceUnitId: currentUnit.id },
                  currentUnit.occurrenceIds[currentUnit.occurrenceIds.length - 1],
                )
              }
              disabled={!playback.engine}
            >
              当前学习段 · 整段播放
            </button>
          </div>
          <p className="practice-covered" aria-live="polite">
            已学到这里：{formatCoveredRange(currentUnit, coveredUntilOccurrenceId)}
          </p>
          {message ? <p className="practice-message" role="status">{message}</p> : null}
          <p className="practice-keyboard-hint">
            Space 播放 · ↑↓ 切句 · Enter 再听 · PageUp / PageDown 切段
          </p>
        </aside>

        {contextOccurrences.length > 0 ? (
          <section
            className="practice-lyrics-context"
            aria-label={`${currentUnit.label} 其余歌词`}
          >
            <ol className="practice-lyric-list">
              {contextOccurrences.map((assembledOccurrence) => (
                <PracticeLyricRow
                  key={assembledOccurrence.occurrence.id}
                  assembledOccurrence={assembledOccurrence}
                  isCurrent={false}
                  onPlay={() => playOccurrence(assembledOccurrence.occurrence.id)}
                />
              ))}
            </ol>
          </section>
        ) : null}

        <details
          className="practice-map"
          open={mapOpen}
          onToggle={(event) => setMapOpen(event.currentTarget.open)}
        >
          <summary
            aria-label={`歌曲地图，${String(unitIndex + 1).padStart(2, '0')} / ${String(practiceIndex.units.length).padStart(2, '0')}，${currentUnit.label}，${mapOpen ? '收起' : '展开'}`}
          >
            <span>歌曲地图</span>
            <span className="practice-map-current">
              {String(unitIndex + 1).padStart(2, '0')} / {String(practiceIndex.units.length).padStart(2, '0')} · {currentUnit.label}
            </span>
            <span className="practice-map-toggle">{mapOpen ? '收起' : '展开'}</span>
          </summary>
          <nav aria-label="学习段">
            <ol>
              {practiceIndex.units.map((unit, index) => {
                const isCurrent = unit.id === currentUnit.id
                const isVisited = Boolean(learningState.coveredUntilByUnit[unit.id])
                return (
                  <li key={unit.id}>
                    <button
                      className={`practice-unit-link${isCurrent ? ' is-current' : ''}`}
                      type="button"
                      aria-current={isCurrent ? 'step' : undefined}
                      onClick={() => {
                        const firstOccurrenceId = unit.occurrenceIds[0]
                        if (firstOccurrenceId) {
                          setPlaybackSession(null)
                          setOccurrence(firstOccurrenceId)
                          setMessage(undefined)
                        }
                      }}
                    >
                      <span className="practice-unit-number">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="practice-unit-label">{unit.label}</span>
                      <span className="practice-unit-state">
                        {isCurrent ? '当前' : isVisited ? '已访问' : '未访问'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>
        </details>
      </div>

      <nav className="practice-pager" aria-label="学习段分页">
        <button
          className="practice-pager-button"
          type="button"
          onClick={() => navigateUnit('previous')}
          disabled={!previousUnit}
        >
          ← 上一段
        </button>
        <span>
          {String(unitIndex + 1).padStart(2, '0')} / {String(practiceIndex.units.length).padStart(2, '0')}
        </span>
        <button
          className="practice-pager-button"
          type="button"
          onClick={() => navigateUnit('next')}
          disabled={!nextUnit}
        >
          下一段 →
        </button>
      </nav>
    </section>
  )
}

function PracticeLyricRow({
  assembledOccurrence,
  isCurrent,
  onPlay,
}: {
  assembledOccurrence: AssembledOccurrence
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
        aria-label={`播放第 ${occurrence.id} 句`}
      >
        {segment.lyrics}
      </button>
      <p className="practice-translation">{segment.translation}</p>
      {segment.layers?.length ? (
        <div className="practice-readings" aria-label="Reading">
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
          {segment.notes.map((note, index) => (
            <p key={`${note.title ?? 'note'}-${index}`}>
              {note.title ? <strong>{note.title}：</strong> : null}
              {note.body}
            </p>
          ))}
        </details>
      ) : null}
    </li>
  )
}

function formatCoveredRange(
  unit: { occurrenceIds: readonly string[] },
  coveredUntilOccurrenceId: string | undefined,
): string {
  if (!coveredUntilOccurrenceId) {
    return '尚未开始'
  }
  const index = unit.occurrenceIds.indexOf(coveredUntilOccurrenceId)
  return index < 0 ? '尚未开始' : `01–${String(index + 1).padStart(2, '0')}`
}

function loadSafeState(
  model: AssembledSongEdition,
  practiceIndex: PracticeIndex,
): PracticeLearningState | null {
  if (practiceIndex.units.length === 0) {
    return null
  }
  try {
    return loadPracticeLearningState(
      model.edition.song.songId,
      model.practice,
      model.timeline,
    )
  } catch {
    try {
      return createInitialPracticeState(practiceIndex)
    } catch {
      return null
    }
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  )
}

interface PracticePlaybackSession {
  range: ResolvedPracticeRange
  activeOccurrenceId?: string
  resumableAtMs?: number
}

function isResumablePosition(
  range: ResolvedPracticeRange,
  positionMs: number,
): boolean {
  return (
    Number.isFinite(positionMs) &&
    positionMs > range.startMs &&
    positionMs < range.endMs
  )
}

function getInitialPracticeMapOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true
  }
  return window.matchMedia('(min-width: 641px)').matches
}
