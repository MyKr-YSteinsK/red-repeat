import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import { DEFAULT_PLAYBACK_RATE } from '../audio/audio-engine'
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
  type PracticeTimingProvider,
} from '../practice/practice-scope'
import {
  createInitialPracticeState,
  loadPracticeLearningState,
  savePracticeLearningState,
  setCurrentPracticeOccurrence,
  type PracticeLearningState,
} from '../practice/practice-state'
import {
  PracticePlaybackSession,
  type PracticePlaybackSessionState,
  type PracticeRepeatMode,
} from '../practice/practice-playback-session'
import { usePracticeController } from './use-practice-controller'
import { calculateShadowRangeSilenceMs } from '../practice/practice-controller'
import {
  createEffectivePracticeTimingProvider,
  readTimingOverrides,
} from '../practice/practice-timing-overrides'
import {
  getNextPracticePlaybackRate,
  readPracticePlaybackRate,
  savePracticePlaybackRate,
} from '../practice/practice-rate'
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
  const timingOverrideDocument = useMemo(() => {
    const result = readTimingOverrides(
      {
        songId: model.edition.song.songId,
        audioSourceHash: model.edition.audio.sourceHash,
        baseTimelineUrl: model.edition.timelineUrl,
      },
      { occurrences: model.timeline.occurrences },
    )
    return result.kind === 'compatible' ? result.document : undefined
  }, [
    model.edition.audio.sourceHash,
    model.edition.song.songId,
    model.edition.timelineUrl,
    model.timeline.occurrences,
  ])
  const practiceTimingProvider = useMemo(
    () =>
      createEffectivePracticeTimingProvider(
        model.timeline,
        timingOverrideDocument,
      ),
    [model.timeline, timingOverrideDocument],
  )
  const [learningState, setLearningState] = useState<PracticeLearningState | null>(
    () => loadSafeState(model, practiceIndex),
  )
  const [mapOpen, setMapOpen] = useState(getInitialPracticeMapOpen)
  const [message, setMessage] = useState<string | undefined>()
  const [targetKind, setTargetKind] = useState<PracticeTargetKind>('currentOccurrence')
  const [customRangeScope, setCustomRangeScope] = useState<CustomRangeScope>()
  const [rangeSelectionStartId, setRangeSelectionStartId] = useState<string>()
  const [rangeSelectionMode, setRangeSelectionMode] = useState(false)
  const [repeatMode, setRepeatMode] = useState<PracticeRepeatMode>(1)
  const [practiceMethod, setPracticeMethod] = useState<PracticeMethod>('repeat')
  const practicePlaybackSession = useMemo(
    () =>
      playback.engine ? new PracticePlaybackSession(playback.engine) : null,
    [playback.engine],
  )
  const [practicePlaybackState, setPracticePlaybackState] =
    useState<PracticePlaybackSessionState>(() =>
      practicePlaybackSession?.getState() ?? createIdlePlaybackState(),
    )
  const {
    controller: practiceController,
    state: practiceStrategyState,
  } = usePracticeController(playback.engine)
  const strategyActive = practiceStrategyState.kind !== 'idle'

  useEffect(() => {
    if (!practicePlaybackSession) {
      return
    }

    const unsubscribe = practicePlaybackSession.subscribe(
      setPracticePlaybackState,
    )
    return () => {
      unsubscribe()
      practicePlaybackSession.cancel()
    }
  }, [practicePlaybackSession])

  useEffect(() => {
    practicePlaybackSession?.cancel()
  }, [
    model.edition.audio.url,
    model.edition.song.songId,
    practicePlaybackSession,
  ])

  useEffect(() => {
    practiceController?.cancel()
  }, [
    model.edition.audio.url,
    model.edition.song.songId,
    practiceController,
  ])

  useEffect(() => {
    if (learningState) {
      savePracticeLearningState(model.edition.song.songId, learningState)
    }
  }, [learningState, model.edition.song.songId])

  useEffect(() => {
    if (!playback.engine) {
      return
    }

    try {
      playback.engine.setPlaybackRate(
        readPracticePlaybackRate(model.edition.song.songId),
      )
    } catch {
      playback.engine.setPlaybackRate(DEFAULT_PLAYBACK_RATE)
    }
  }, [model.edition.song.songId, playback.engine])

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

  const changePracticeMethod = useCallback(
    (nextMethod: PracticeMethod): void => {
      cancelPracticeOperations(practicePlaybackSession, practiceController)
      setPracticeMethod(nextMethod)
      setMessage(undefined)
    },
    [practiceController, practicePlaybackSession],
  )

  const playScope = useCallback(
    (
      scope: PracticeScope,
      activeOccurrenceId?: string,
      nextRepeatMode: PracticeRepeatMode = 1,
    ): void => {
      if (!practicePlaybackSession) {
        setMessage('当前环境无法播放音频。')
        return
      }

      try {
        practiceController?.cancel()
        setPracticeMethod('repeat')
        const range = resolvePracticeRange(
          scope,
          model.practice,
          model.timeline,
          practiceTimingProvider,
        )
        practicePlaybackSession.start(
          { range, activeOccurrenceId },
          nextRepeatMode,
        )
        setMessage(undefined)
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '练习范围无效。')
      }
    },
    [
      model.practice,
      model.timeline,
      practiceController,
      practicePlaybackSession,
      practiceTimingProvider,
    ],
  )

  const playOccurrence = useCallback(
    (occurrenceId: string): void => {
      setOccurrence(occurrenceId)
      if (targetKind !== 'customRange') {
        setTargetKind('currentOccurrence')
      }
      playScope({ kind: 'currentOccurrence', occurrenceId }, occurrenceId)
    },
    [playScope, setOccurrence, targetKind],
  )

  const beginRangeSelection = useCallback(
    (startOccurrenceId?: string): void => {
      cancelPracticeOperations(practicePlaybackSession, practiceController)
      setTargetKind('customRange')
      setRangeSelectionMode(true)
      setRangeSelectionStartId(startOccurrenceId)
      setMessage(
        startOccurrenceId
          ? `已选择${formatPracticeLocation(practiceIndex, startOccurrenceId)}为起点，请选择终点。`
          : '自选范围：请选择起点。',
      )
    },
    [practiceController, practiceIndex, practicePlaybackSession],
  )

  const selectRangeEndpoint = useCallback(
    (occurrenceId: string): void => {
      if (!rangeSelectionMode) {
        playOccurrence(occurrenceId)
        return
      }

      const startOccurrenceId = rangeSelectionStartId
      if (!startOccurrenceId) {
        setRangeSelectionStartId(occurrenceId)
        setMessage(
          `已选择${formatPracticeLocation(practiceIndex, occurrenceId)}为起点，请选择终点。`,
        )
        return
      }

      try {
        const nextCustomRange = normalizeCustomRangeScope(
          practiceIndex,
          startOccurrenceId,
          occurrenceId,
        )
        setCustomRangeScope(nextCustomRange)
        setTargetKind('customRange')
        setRangeSelectionMode(false)
        setRangeSelectionStartId(undefined)
        cancelPracticeOperations(practicePlaybackSession, practiceController)
        const range = resolvePracticeRange(
          nextCustomRange,
          model.practice,
          model.timeline,
          practiceTimingProvider,
        )
        setMessage(
          `${formatTargetSummary('customRange', range, practiceIndex)}。`,
        )
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '自选范围无效。')
      }
    },
    [
      model.practice,
      model.timeline,
      playOccurrence,
      practiceIndex,
      practicePlaybackSession,
      practiceController,
      practiceTimingProvider,
      rangeSelectionMode,
      rangeSelectionStartId,
    ],
  )

  const selectTarget = useCallback(
    (nextTargetKind: PracticeTargetKind): void => {
      cancelPracticeOperations(practicePlaybackSession, practiceController)
      if (nextTargetKind === 'customRange') {
        beginRangeSelection(customRangeScope?.startOccurrenceId)
        return
      }
      setTargetKind(nextTargetKind)
      setRangeSelectionMode(false)
      setRangeSelectionStartId(undefined)
      setMessage(undefined)
    },
    [
      beginRangeSelection,
      customRangeScope?.startOccurrenceId,
      practiceController,
      practicePlaybackSession,
    ],
  )

  const clearCustomRange = useCallback((): void => {
    cancelPracticeOperations(practicePlaybackSession, practiceController)
    setCustomRangeScope(undefined)
    setRangeSelectionStartId(undefined)
    setRangeSelectionMode(false)
    setTargetKind('currentOccurrence')
    setMessage('已清除自选范围。')
  }, [practiceController, practicePlaybackSession])

  const resolvePracticeTarget = useCallback(
    (nextTargetKind: PracticeTargetKind = targetKind):
      | {
          scope: PracticeScope
          range: ResolvedPracticeRange
          activeOccurrenceId?: string
        }
      | undefined => {
      const resolvedTarget = getTargetScope(
        nextTargetKind,
        learningState?.currentOccurrenceId,
        practiceIndex.unitsById.get(learningState?.practiceUnitId ?? ''),
        learningState
          ? learningState.coveredUntilByUnit[learningState.practiceUnitId]
          : undefined,
        customRangeScope,
      )
      if (!resolvedTarget) {
        return undefined
      }

      try {
        return {
          scope: resolvedTarget.scope,
          range: resolvePracticeRange(
            resolvedTarget.scope,
            model.practice,
            model.timeline,
            practiceTimingProvider,
          ),
          activeOccurrenceId: resolvedTarget.activeOccurrenceId,
        }
      } catch {
        return undefined
      }
    },
    [
      customRangeScope,
      learningState,
      model.practice,
      model.timeline,
      practiceIndex.unitsById,
      practiceTimingProvider,
      targetKind,
    ],
  )

  const startTarget = useCallback(
    (
      nextTargetKind: PracticeTargetKind = targetKind,
      nextRepeatMode: PracticeRepeatMode = repeatMode,
      nextMethod: PracticeMethod = practiceMethod,
    ): void => {
      if (nextTargetKind === 'customRange' && !customRangeScope) {
        beginRangeSelection()
        return
      }

      const resolvedTarget = resolvePracticeTarget(nextTargetKind)
      if (!resolvedTarget) {
        setMessage('当前练习目标还没有可播放的范围。')
        return
      }

      setTargetKind(nextTargetKind)
      if (nextMethod === 'ramp') {
        cancelPracticeOperations(practicePlaybackSession, practiceController)
        if (!practiceController?.startRamp(resolvedTarget.range)) {
          setMessage('渐速练习暂时无法开始。')
          return
        }
        setMessage(undefined)
        return
      }
      if (nextMethod === 'shadow') {
        cancelPracticeOperations(practicePlaybackSession, practiceController)
        if (
          !practiceController?.startShadowRange({
            range: resolvedTarget.range,
            activeOccurrenceId: resolvedTarget.activeOccurrenceId,
          })
        ) {
          setMessage('跟唱留白暂时无法开始。')
          return
        }
        setMessage(undefined)
        return
      }

      playScope(
        resolvedTarget.scope,
        resolvedTarget.activeOccurrenceId,
        nextRepeatMode,
      )
    },
    [
      beginRangeSelection,
      customRangeScope,
      practiceController,
      practiceMethod,
      practicePlaybackSession,
      playScope,
      repeatMode,
      resolvePracticeTarget,
      targetKind,
    ],
  )

  const changeRepeatMode = useCallback(
    (nextRepeatMode: PracticeRepeatMode): void => {
      cancelPracticeOperations(practicePlaybackSession, practiceController)
      setRepeatMode(nextRepeatMode)
    },
    [practiceController, practicePlaybackSession],
  )

  const changePlaybackRate = useCallback(
    (requestedRate: number): void => {
      if (!playback.engine || strategyActive) {
        return
      }

      try {
        const normalizedRate = playback.engine.setPlaybackRate(requestedRate)
        savePracticePlaybackRate(model.edition.song.songId, normalizedRate)
        setMessage(undefined)
      } catch {
        setMessage('播放速度无效。')
      }
    },
    [model.edition.song.songId, playback.engine, strategyActive],
  )

  const adjustPlaybackRate = useCallback(
    (direction: -1 | 1): void => {
      if (!playback.engine) {
        return
      }
      const nextRate = getNextPracticePlaybackRate(
        playback.engine.getState().playbackRate,
        direction,
      )
      changePlaybackRate(nextRate)
    },
    [changePlaybackRate, playback.engine],
  )

  const stopPlayback = useCallback((): void => {
    cancelPracticeOperations(practicePlaybackSession, practiceController)
  }, [practiceController, practicePlaybackSession])

  const toggleInfinitePlayback = useCallback((): void => {
    if (strategyActive) {
      stopPlayback()
      return
    }
    if (
      practicePlaybackState.repeatMode === 'infinite' &&
      (practicePlaybackState.status === 'playing' ||
        practicePlaybackState.status === 'paused')
    ) {
      stopPlayback()
      return
    }

    setPracticeMethod('repeat')
    setRepeatMode('infinite')
    startTarget(targetKind, 'infinite', 'repeat')
  }, [
    practicePlaybackState.repeatMode,
    practicePlaybackState.status,
    startTarget,
    stopPlayback,
    strategyActive,
    targetKind,
  ])

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
        cancelPracticeOperations(practicePlaybackSession, practiceController)
        setOccurrence(firstOccurrenceId)
        setMessage(
          rangeSelectionMode
            ? rangeSelectionStartId
              ? `已保留起点 ${formatPracticeLocation(practiceIndex, rangeSelectionStartId)}，请在当前学习段选择终点。`
              : '自选范围：请选择起点。'
            : undefined,
        )
      }
    },
    [
      learningState,
      practiceIndex,
      practiceController,
      practicePlaybackSession,
      rangeSelectionMode,
      rangeSelectionStartId,
      setOccurrence,
    ],
  )

  const togglePlayback = useCallback((): void => {
    if (!practicePlaybackSession || !learningState) {
      setMessage('当前环境无法播放音频。')
      return
    }
    if (strategyActive) {
      stopPlayback()
      return
    }
    if (practicePlaybackState.status === 'playing') {
      practicePlaybackSession.pause()
      return
    }
    if (practicePlaybackState.status === 'paused') {
      practicePlaybackSession.resume()
      return
    }

    startTarget()
  }, [
    learningState,
    practicePlaybackSession,
    practicePlaybackState.status,
    stopPlayback,
    startTarget,
    strategyActive,
  ])

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

      if (event.key === 'Escape' && strategyActive) {
        event.preventDefault()
        stopPlayback()
      } else if (isRateIncreaseKey(event)) {
        event.preventDefault()
        adjustPlaybackRate(1)
      } else if (isRateDecreaseKey(event)) {
        event.preventDefault()
        adjustPlaybackRate(-1)
      } else if (event.key.toLowerCase() === 'r') {
        event.preventDefault()
        toggleInfinitePlayback()
      } else if (event.key === ' ' || event.code === 'Space') {
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
  }, [
    learningState,
    adjustPlaybackRate,
    navigateOccurrence,
    navigateUnit,
    playOccurrence,
    toggleInfinitePlayback,
    togglePlayback,
    strategyActive,
    stopPlayback,
  ])

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
  const canResume = practicePlaybackState.status === 'paused'
  const selectedTarget = getTargetScope(
    targetKind,
    currentOccurrence.occurrence.id,
    currentUnit,
    coveredUntilOccurrenceId,
    customRangeScope,
  )
  const selectedRange = selectedTarget
    ? resolveSafePracticeRange(
        selectedTarget.scope,
        model,
        practiceTimingProvider,
      )
    : undefined
  const strategyProgress = describePracticeStrategy(practiceStrategyState)
  const repeatProgress = describePracticeRepeat(practicePlaybackState)
  const rangeSelectionLabel = rangeSelectionMode
    ? rangeSelectionStartId
      ? `已选起点：${formatPracticeLocation(practiceIndex, rangeSelectionStartId)}，请选择终点`
      : '请选择起点'
    : undefined
  const customRangeOccurrenceIds = customRangeScope
    ? new Set(
        resolveSafePracticeRange(
          customRangeScope,
          model,
          practiceTimingProvider,
        )?.occurrenceIds ?? [],
      )
    : undefined
  const isPracticePlaybackActive =
    practicePlaybackState.status === 'playing' ||
    practicePlaybackState.status === 'paused'
  const isRepeatingPlayback =
    isPracticePlaybackActive &&
    (practicePlaybackState.repeatMode === 3 ||
      practicePlaybackState.repeatMode === 'infinite')

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
              lyricNumber={
                currentUnitOccurrences.findIndex(
                  ({ occurrence }) =>
                    occurrence.id === currentOccurrence.occurrence.id,
                ) + 1
              }
              isCurrent
              isInCustomRange={customRangeOccurrenceIds?.has(currentOccurrence.occurrence.id) ?? false}
              isRangeAnchor={rangeSelectionStartId === currentOccurrence.occurrence.id}
              rangeSelectionMode={rangeSelectionMode}
              onPlay={() => playOccurrence(currentOccurrence.occurrence.id)}
              onSelectRangeEndpoint={selectRangeEndpoint}
            />
          </ol>
        </section>

        <aside className="practice-controls" aria-label="练习控制">
          <p className="practice-control-kicker">练习控制</p>
          <p className="practice-current-label">
            当前：{formatPracticeLocation(practiceIndex, currentOccurrence.occurrence.id)} · {currentOccurrence.segment.lyrics}
          </p>
          <div className="practice-target-actions" aria-label="练习目标">
            <button
              className="practice-action"
              type="button"
              aria-pressed={targetKind === 'currentOccurrence'}
              onClick={() => selectTarget('currentOccurrence')}
            >
              当前句
            </button>
            <button
              className="practice-action"
              type="button"
              aria-pressed={targetKind === 'coveredRange'}
              onClick={() => selectTarget('coveredRange')}
            >
              已学到这里
            </button>
            <button
              className="practice-action"
              type="button"
              aria-pressed={targetKind === 'practiceUnit'}
              onClick={() => selectTarget('practiceUnit')}
            >
              当前学习段
            </button>
            <button
              className="practice-action"
              type="button"
              aria-pressed={targetKind === 'customRange'}
              onClick={() => selectTarget('customRange')}
            >
              自选范围
            </button>
          </div>
          {rangeSelectionLabel ? (
            <p className="practice-range-selection" role="status">
              {rangeSelectionLabel}
            </p>
          ) : null}
          <p className="practice-target-summary" aria-live="polite">
            {formatTargetSummary(targetKind, selectedRange, practiceIndex)}
          </p>
          {customRangeScope ? (
            <div className="practice-custom-range-actions">
              <button
                className="practice-action"
                type="button"
                onClick={() => beginRangeSelection(customRangeScope.startOccurrenceId)}
              >
                修改自选范围
              </button>
              <button
                className="practice-action"
                type="button"
                onClick={clearCustomRange}
              >
                清除自选范围
              </button>
            </div>
          ) : null}
          <div className="practice-method-actions" aria-label="练习方式">
            <button
              className="practice-action"
              type="button"
              aria-pressed={practiceMethod === 'repeat'}
              onClick={() => changePracticeMethod('repeat')}
            >
              普通重复
            </button>
            <button
              className="practice-action"
              type="button"
              aria-pressed={practiceMethod === 'ramp'}
              onClick={() => changePracticeMethod('ramp')}
            >
              渐速练习
            </button>
            <button
              className="practice-action"
              type="button"
              aria-pressed={practiceMethod === 'shadow'}
              onClick={() => changePracticeMethod('shadow')}
            >
              跟唱留白
            </button>
          </div>
          {practiceMethod === 'repeat' ? (
            <div className="practice-repeat-actions" aria-label="循环次数">
              <button
                className="practice-action"
                type="button"
                aria-pressed={repeatMode === 1}
                onClick={() => changeRepeatMode(1)}
              >
                1次
              </button>
              <button
                className="practice-action"
                type="button"
                aria-pressed={repeatMode === 3}
                onClick={() => changeRepeatMode(3)}
              >
                3次
              </button>
              <button
                className="practice-action"
                type="button"
                aria-pressed={repeatMode === 'infinite'}
                onClick={() => changeRepeatMode('infinite')}
              >
                一直
              </button>
            </div>
          ) : practiceMethod === 'ramp' ? (
            <p className="practice-method-profile" aria-live="polite">
              0.70x ×2 → 0.85x ×2 → 1.00x ×2
            </p>
          ) : (
            <p className="practice-method-profile" aria-live="polite">
              听原声 → 轮到你 → 再听原声 · 留白 {formatDuration(getShadowSilenceDuration(selectedRange, playback.audioState.playbackRate))}
            </p>
          )}
          <div className="practice-rate-actions" aria-label="播放速度">
            <button
              className="practice-action"
              type="button"
              aria-label="减速"
              onClick={() => adjustPlaybackRate(-1)}
              disabled={!playback.engine || strategyActive}
            >
              −
            </button>
            {PRACTICE_RATE_PRESETS.map((preset) => (
              <button
                key={preset}
                className="practice-action"
                type="button"
                aria-pressed={playback.audioState.playbackRate === preset}
                onClick={() => changePlaybackRate(preset)}
                disabled={!playback.engine || strategyActive}
              >
                {preset.toFixed(2)}x
              </button>
            ))}
            <button
              className="practice-action"
              type="button"
              aria-label="加速"
              onClick={() => adjustPlaybackRate(1)}
              disabled={!playback.engine || strategyActive}
            >
              +
            </button>
          </div>
          <p className="practice-rate-current" aria-live="polite">
            当前速度：{playback.audioState.playbackRate.toFixed(2)}x
          </p>
          <div className="practice-primary-actions">
            <button
              className="practice-action practice-action-primary"
              type="button"
              onClick={() => playOccurrence(currentOccurrence.occurrence.id)}
              disabled={!practicePlaybackSession}
            >
              再听这句
            </button>
            {strategyActive ? (
              <button
                className="practice-action"
                type="button"
                onClick={stopPlayback}
              >
                停止练习
              </button>
            ) : (
              <button
                className="practice-action"
                type="button"
                onClick={togglePlayback}
                disabled={!practicePlaybackSession}
              >
                {practiceMethod === 'ramp'
                  ? '开始渐速练习'
                  : practiceMethod === 'shadow'
                    ? '开始跟唱'
                    : practicePlaybackState.status === 'playing'
                      ? '暂停'
                      : canResume
                        ? '继续'
                        : '开始'}
              </button>
            )}
            {!strategyActive && isRepeatingPlayback ? (
              <button
                className="practice-action"
                type="button"
                onClick={stopPlayback}
              >
                停止
              </button>
            ) : null}
          </div>
          {strategyProgress ? (
            <p className="practice-strategy-progress" role="status">
              {strategyProgress}
            </p>
          ) : null}
          {repeatProgress ? (
            <p className="practice-repeat-progress" role="status">
              {repeatProgress}
            </p>
          ) : null}
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
              onClick={() => startTarget('coveredRange')}
              disabled={!coveredUntilOccurrenceId || !practicePlaybackSession}
            >
              已学到这里 · 连续播放
            </button>
            <button
              className="practice-action"
              type="button"
              onClick={() =>
                startTarget('practiceUnit')
              }
              disabled={!practicePlaybackSession}
            >
              当前学习段 · 整段播放
            </button>
          </div>
          <p className="practice-covered" aria-live="polite">
            已学到这里：{formatCoveredRange(currentUnit, coveredUntilOccurrenceId)}
          </p>
          {message ? <p className="practice-message" role="status">{message}</p> : null}
          <p className="practice-keyboard-hint">
            Space 播放/暂停 · R 一直循环 · ↑↓ 切句 · Enter 再听 · PageUp / PageDown 切段
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
                  lyricNumber={
                    currentUnit.occurrenceIds.indexOf(
                      assembledOccurrence.occurrence.id,
                    ) + 1
                  }
                  isCurrent={false}
                  isInCustomRange={customRangeOccurrenceIds?.has(assembledOccurrence.occurrence.id) ?? false}
                  isRangeAnchor={rangeSelectionStartId === assembledOccurrence.occurrence.id}
                  rangeSelectionMode={rangeSelectionMode}
                  onPlay={() => playOccurrence(assembledOccurrence.occurrence.id)}
                  onSelectRangeEndpoint={selectRangeEndpoint}
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
                          cancelPracticeOperations(
                            practicePlaybackSession,
                            practiceController,
                          )
                          setOccurrence(firstOccurrenceId)
                          setMessage(
                            rangeSelectionMode
                              ? rangeSelectionStartId
                                ? `已保留起点 ${formatPracticeLocation(practiceIndex, rangeSelectionStartId)}，请在当前学习段选择终点。`
                                : '自选范围：请选择起点。'
                              : undefined,
                          )
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
  lyricNumber,
  isCurrent,
  isInCustomRange,
  isRangeAnchor,
  rangeSelectionMode,
  onPlay,
  onSelectRangeEndpoint,
}: {
  assembledOccurrence: AssembledOccurrence
  lyricNumber: number
  isCurrent: boolean
  isInCustomRange: boolean
  isRangeAnchor: boolean
  rangeSelectionMode: boolean
  onPlay: () => void
  onSelectRangeEndpoint: (occurrenceId: string) => void
}) {
  const { occurrence, segment } = assembledOccurrence
  const rowClassName = [
    'practice-lyric-row',
    isCurrent ? 'is-current' : '',
    isInCustomRange ? 'is-in-custom-range' : '',
    isRangeAnchor ? 'is-range-anchor' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <li
      className={rowClassName}
      data-occurrence-id={occurrence.id}
    >
      <button
        className="practice-original"
        type="button"
        onClick={() =>
          rangeSelectionMode
            ? onSelectRangeEndpoint(occurrence.id)
            : onPlay()
        }
        aria-label={
          rangeSelectionMode
            ? `选择第 ${String(lyricNumber).padStart(2, '0')} 句作为范围端点`
            : `播放第 ${String(lyricNumber).padStart(2, '0')} 句`
        }
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

function getInitialPracticeMapOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true
  }
  return window.matchMedia('(min-width: 641px)').matches
}

function createIdlePlaybackState(): PracticePlaybackSessionState {
  return {
    status: 'idle',
    completedRepetitions: 0,
  }
}

type PracticeTargetKind =
  | 'currentOccurrence'
  | 'coveredRange'
  | 'practiceUnit'
  | 'customRange'

type CustomRangeScope = Extract<PracticeScope, { kind: 'customRange' }>

function getTargetScope(
  targetKind: PracticeTargetKind,
  currentOccurrenceId: string | undefined,
  currentUnit: PracticeIndex['units'][number] | undefined,
  coveredUntilOccurrenceId: string | undefined,
  customRangeScope: CustomRangeScope | undefined,
): { scope: PracticeScope; activeOccurrenceId?: string } | undefined {
  if (targetKind === 'currentOccurrence' && currentOccurrenceId) {
    return {
      scope: { kind: 'currentOccurrence', occurrenceId: currentOccurrenceId },
      activeOccurrenceId: currentOccurrenceId,
    }
  }

  if (
    targetKind === 'coveredRange' &&
    currentUnit &&
    coveredUntilOccurrenceId
  ) {
    return {
      scope: {
        kind: 'coveredRange',
        practiceUnitId: currentUnit.id,
        endOccurrenceId: coveredUntilOccurrenceId,
      },
      activeOccurrenceId: coveredUntilOccurrenceId,
    }
  }

  if (targetKind === 'practiceUnit' && currentUnit) {
    const activeOccurrenceId = currentUnit.occurrenceIds.at(-1)
    return {
      scope: { kind: 'practiceUnit', practiceUnitId: currentUnit.id },
      activeOccurrenceId,
    }
  }

  if (targetKind === 'customRange' && customRangeScope) {
    return {
      scope: customRangeScope,
      activeOccurrenceId: customRangeScope.endOccurrenceId,
    }
  }

  return undefined
}

function resolveSafePracticeRange(
  scope: PracticeScope,
  model: AssembledSongEdition,
  timingProvider?: PracticeTimingProvider,
): ResolvedPracticeRange | undefined {
  try {
    return resolvePracticeRange(
      scope,
      model.practice,
      model.timeline,
      timingProvider,
    )
  } catch {
    return undefined
  }
}

function normalizeCustomRangeScope(
  practiceIndex: PracticeIndex,
  firstOccurrenceId: string,
  secondOccurrenceId: string,
): CustomRangeScope {
  const firstIndex = practiceIndex.chronologicalOccurrenceIds.indexOf(
    firstOccurrenceId,
  )
  const secondIndex = practiceIndex.chronologicalOccurrenceIds.indexOf(
    secondOccurrenceId,
  )
  if (firstIndex < 0 || secondIndex < 0) {
    throw new Error('自选范围引用了未知的 Occurrence。')
  }

  return firstIndex <= secondIndex
    ? {
        kind: 'customRange',
        startOccurrenceId: firstOccurrenceId,
        endOccurrenceId: secondOccurrenceId,
      }
    : {
        kind: 'customRange',
        startOccurrenceId: secondOccurrenceId,
        endOccurrenceId: firstOccurrenceId,
      }
}

function formatTargetSummary(
  targetKind: PracticeTargetKind,
  range: ResolvedPracticeRange | undefined,
  practiceIndex: PracticeIndex,
): string {
  const label = {
    currentOccurrence: '当前句',
    coveredRange: '已学到这里',
    practiceUnit: '当前学习段',
    customRange: '自选范围',
  }[targetKind]
  if (!range) {
    return `${label}：尚未选择范围`
  }

  const startOccurrenceId = range.occurrenceIds[0]
  const endOccurrenceId = range.occurrenceIds[range.occurrenceIds.length - 1]
  const startLocation = getPracticeLocation(practiceIndex, startOccurrenceId)
  const endLocation = getPracticeLocation(practiceIndex, endOccurrenceId)
  const location =
    startLocation.unitId === endLocation.unitId
      ? startLocation.position === endLocation.position
        ? `第 ${String(startLocation.position).padStart(2, '0')} 句`
        : `${String(startLocation.position).padStart(2, '0')}–${String(endLocation.position).padStart(2, '0')} 句`
      : `${startLocation.unitLabel} ${String(startLocation.position).padStart(2, '0')} → ${endLocation.unitLabel} ${String(endLocation.position).padStart(2, '0')}`
  return `${label}：${location} · ${range.occurrenceIds.length} 句 · ${formatDuration(range.endMs - range.startMs)}`
}

function getPracticeLocation(
  practiceIndex: PracticeIndex,
  occurrenceId: string,
): { unitId: string; unitLabel: string; position: number } {
  const unitId = practiceIndex.unitIdByOccurrenceId.get(occurrenceId)
  const unit = unitId ? practiceIndex.unitsById.get(unitId) : undefined
  const position = unit ? unit.occurrenceIds.indexOf(occurrenceId) + 1 : 0
  return {
    unitId: unitId ?? occurrenceId,
    unitLabel: unit?.label ?? '当前学习段',
    position: position > 0 ? position : 1,
  }
}

function formatPracticeLocation(
  practiceIndex: PracticeIndex,
  occurrenceId: string,
): string {
  const location = getPracticeLocation(practiceIndex, occurrenceId)
  return `第 ${String(location.position).padStart(2, '0')} 句`
}

function getShadowSilenceDuration(
  range: ResolvedPracticeRange | undefined,
  playbackRate: number,
): number {
  if (!range) {
    return 0
  }
  return calculateShadowRangeSilenceMs(range, playbackRate)
}

function formatDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(2)} 秒`
}

const PRACTICE_RATE_PRESETS = [0.65, 0.75, 0.85, 1] as const

type PracticeMethod = 'repeat' | 'ramp' | 'shadow'

function describePracticeStrategy(
  state: import('../practice/practice-controller').PracticeStrategyState,
): string {
  if (state.kind === 'idle') {
    return ''
  }
  if (state.kind === 'ramp') {
    return `渐速练习 · 第 ${state.completedRepetitions + 1} / ${state.totalRepetitions} 次 · ${state.stageSpeed.toFixed(2)}x`
  }
  if (state.phase === 'source-before') {
    return '正在听原声'
  }
  if (state.phase === 'your-turn') {
    return `轮到你 · 约 ${Math.ceil(state.silenceDurationMs / 1000)} 秒`
  }
  return '再听一次'
}

function describePracticeRepeat(
  state: PracticePlaybackSessionState,
): string {
  if (state.status !== 'playing' && state.status !== 'paused') {
    return ''
  }
  if (state.repeatMode === 3 && state.currentRepetition) {
    return `第 ${state.currentRepetition} / 3 次`
  }
  if (state.repeatMode === 'infinite') {
    return `正在循环 · 已完成 ${state.completedRepetitions} 次`
  }
  return ''
}

function cancelPracticeOperations(
  playbackSession: { cancel: () => void } | null | undefined,
  practiceController: { cancel: () => void } | null | undefined,
): void {
  practiceController?.cancel()
  playbackSession?.cancel()
}

function isRateIncreaseKey(event: KeyboardEvent): boolean {
  return (
    event.key === '+' ||
    (event.key === '=' && event.shiftKey) ||
    event.code === 'NumpadAdd'
  )
}

function isRateDecreaseKey(event: KeyboardEvent): boolean {
  return event.key === '-' || event.code === 'NumpadSubtract'
}
