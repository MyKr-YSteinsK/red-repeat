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
import { useSessionViewState } from './song-playback-context'
import {
  LyricDisplayPreferencesControls,
  useLyricAnchorPreservation,
  useLyricDisplayPreferences,
  visibleLyricLayers,
} from './LyricDisplayPreferences'

const PRACTICE_SPEEDS = [0.6, 0.8, 1] as const
type PracticeSpeed = (typeof PRACTICE_SPEEDS)[number]

export interface PracticeWorkspaceProps {
  model: AssembledSongEdition
  runtimeClient: RuntimeClient
  audioEngine?: AudioEngine
  requestedPracticeUnitId?: string
  onRequestedPracticeUnitConsumed?: () => void
  requestedPracticeIntent?: { practiceUnitId: string; occurrenceId: string }
  onRequestedPracticeIntentConsumed?: () => void
  initialPracticeTarget?: { practiceUnitId: string; occurrenceId: string }
  onResumePosition?: (target: { practiceUnitId: string; occurrenceId: string }) => void
  onShowRelatedExplain?: (occurrenceId: string, segmentId: string) => void
  createTimingDebuggerHref?: (occurrenceId: string) => string
  onAddToQueue?: (occurrence: AssembledOccurrence) => 'added' | 'duplicate' | 'full' | 'unavailable'
  activeQueueItemId?: string
  nextQueueHref?: string
}

export function PracticeWorkspace({
  model,
  runtimeClient,
  audioEngine,
  requestedPracticeUnitId,
  onRequestedPracticeUnitConsumed,
  requestedPracticeIntent,
  onRequestedPracticeIntentConsumed,
  initialPracticeTarget,
  onResumePosition,
  onShowRelatedExplain,
  createTimingDebuggerHref,
  onAddToQueue,
  activeQueueItemId,
  nextQueueHref,
}: PracticeWorkspaceProps) {
  const playback = useSongEditionPlayback(model, runtimeClient, audioEngine)
  const practiceIndex = useMemo(
    () => createPracticeIndex(model.practice, model.timeline),
    [model.practice, model.timeline],
  )
  const [learningState, setLearningState] = useSessionViewState<PracticeLearningState>('practice.selection', () =>
    loadSafeLearningState(model, practiceIndex, initialPracticeTarget),
  )
  const [continuousPlayback, setContinuousPlayback] = useSessionViewState('practice.continuous', false)
  const [rampPractice, setRampPractice] = useSessionViewState('practice.ramp', false)
  const [playbackRate, setPlaybackRate] = useSessionViewState<PracticeSpeed>('practice.rate', () =>
    normalizePracticeSpeed(readPracticePlaybackRate(model.edition.song.songId)),
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [moreControlsExpanded, setMoreControlsExpanded] = useState(false)
  const [message, setMessage] = useState<string>()
  const [completedQueueItemId, setCompletedQueueItemId] = useState<string>()
  const workspaceRef = useRef<HTMLElement | null>(null)
  const dockRef = useRef<HTMLElement | null>(null)
  const lyricsAnchorRef = useRef<HTMLElement | null>(null)
  const pendingNavigationRef = useRef(Boolean(initialPracticeTarget))
  const pendingOccurrenceNavigationRef = useRef(Boolean(initialPracticeTarget))
  const initialPracticeTargetKey = initialPracticeTarget
    ? `${initialPracticeTarget.practiceUnitId}\u0000${initialPracticeTarget.occurrenceId}`
    : undefined
  const previousInitialPracticeTargetKey = useRef(initialPracticeTargetKey)
  const { preferences } = useLyricDisplayPreferences()
  const preserveLyricAnchor = useLyricAnchorPreservation(
    workspaceRef,
    preferences,
  )

  const currentUnit =
    practiceIndex.unitsById.get(learningState.practiceUnitId) ??
    practiceIndex.units[0]
  const currentOccurrence = currentUnit
    ? model.occurrencesById[learningState.currentOccurrenceId] ??
      model.occurrencesById[currentUnit.occurrenceIds[0]]
    : undefined
  useEffect(() => {
    if (currentUnit && currentOccurrence) {
      onResumePosition?.({
        practiceUnitId: currentUnit.id,
        occurrenceId: currentOccurrence.occurrence.id,
      })
    }
  }, [currentOccurrence, currentUnit, onResumePosition])
  const followsPlayback =
    (continuousPlayback || rampPractice) && playback.audioState.status === 'playing'
  const primaryOccurrenceId = playback.resolution.primaryOccurrence?.id

  const cancelPlayback = useCallback((): void => {
    playback.session?.pause()
  }, [playback.session])

  const persistLearningState = useCallback(
    (nextState: PracticeLearningState): void => {
      setLearningState(nextState)
      savePracticeLearningState(model.edition.song.songId, nextState)
      onResumePosition?.({
        practiceUnitId: nextState.practiceUnitId,
        occurrenceId: nextState.currentOccurrenceId,
      })
    },
    [model.edition.song.songId, onResumePosition, setLearningState],
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
      playback.session?.cancelPractice()
      pendingNavigationRef.current = true
      pendingOccurrenceNavigationRef.current = false
      const nextState = focusPracticeUnitStart(
        learningState,
        practiceIndex,
        practiceUnitId,
      )
      persistLearningState(nextState)
      setPickerOpen(false)
      setMessage(undefined)
    },
    [learningState, persistLearningState, practiceIndex, playback.session],
  )

  useEffect(() => {
    if (!initialPracticeTargetKey) {
      previousInitialPracticeTargetKey.current = undefined
      return
    }
    if (previousInitialPracticeTargetKey.current === initialPracticeTargetKey) {
      return
    }

    const practiceUnitId = initialPracticeTarget?.practiceUnitId
    const occurrenceId = initialPracticeTarget?.occurrenceId
    if (!practiceUnitId || !occurrenceId) return

    const timeout = globalThis.setTimeout(() => {
      previousInitialPracticeTargetKey.current = initialPracticeTargetKey
      const unit = practiceIndex.unitsById.get(practiceUnitId)
      if (!unit || !unit.occurrenceIds.includes(occurrenceId)) {
        setMessage('这条待练目标目前不属于可用的练习段。')
        return
      }

      playback.session?.cancelPractice()
      pendingNavigationRef.current = true
      pendingOccurrenceNavigationRef.current = true
      const focusedState = focusPracticeUnitStart(
        learningState,
        practiceIndex,
        unit.id,
      )
      persistLearningState(
        setCurrentPracticeOccurrence(focusedState, practiceIndex, occurrenceId),
      )
      setCompletedQueueItemId(undefined)
      setMessage(undefined)
    }, 0)

    return () => globalThis.clearTimeout(timeout)
  }, [
    initialPracticeTargetKey,
    initialPracticeTarget?.practiceUnitId,
    initialPracticeTarget?.occurrenceId,
    learningState,
    practiceIndex,
    persistLearningState,
    playback.session,
  ])

  useLayoutEffect(() => {
    if (!pendingNavigationRef.current) {
      return
    }
    pendingNavigationRef.current = false
    const target = pendingOccurrenceNavigationRef.current
      ? Array.from(
          workspaceRef.current?.querySelectorAll<HTMLElement>('[data-occurrence-id]') ?? [],
        ).find((element) => element.dataset.occurrenceId === learningState.currentOccurrenceId)
      : lyricsAnchorRef.current
    pendingOccurrenceNavigationRef.current = false
    restoreScrollPolicy(
      'reveal-content-start',
      undefined,
      target ?? lyricsAnchorRef.current,
      96,
    )
  }, [learningState.practiceUnitId, learningState.currentOccurrenceId])

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

      const scrollRoot = document.scrollingElement ?? document.documentElement
      const finalRow = workspace.querySelector<HTMLElement>(
        '.practice-lyric-row:last-child',
      )
      const currentReserve = Math.max(
        0,
        Number.parseFloat(getComputedStyle(workspace).paddingBottom) || 0,
      )
      const finalRowDocumentBottom = finalRow
        ? finalRow.getBoundingClientRect().bottom + scrollRoot.scrollTop
        : 0
      const baseScrollHeight = Math.max(
        0,
        scrollRoot.scrollHeight - currentReserve,
      )
      const breathingRoom =
        Number.parseFloat(getComputedStyle(workspace).fontSize) || 16
      const reachabilityReserve = finalRow
        ? Math.max(
            breathingRoom,
            finalRowDocumentBottom -
              baseScrollHeight +
              occlusion +
              breathingRoom,
          )
        : breathingRoom
      workspace.style.setProperty(
        '--practice-dock-reachability-reserve',
        `${Math.ceil(reachabilityReserve)}px`,
      )
    }

    updateDockOcclusion()
    const resizeObserver =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(updateDockOcclusion)
        : undefined
    resizeObserver?.observe(workspace)
    resizeObserver?.observe(dock)
    window.addEventListener('resize', updateDockOcclusion)
    window.visualViewport?.addEventListener('resize', updateDockOcclusion)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateDockOcclusion)
      window.visualViewport?.removeEventListener('resize', updateDockOcclusion)
    }
  }, [currentUnit?.id])

  const playSelection = useCallback(
    async (occurrenceId: string, forceUnit = false): Promise<void> => {
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

      const range = continuousPlayback || forceUnit
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
      setMessage(undefined)
      setCompletedQueueItemId(undefined)
      const completion = await playback.session?.playPractice(range, occurrenceId, rampPractice ? PRACTICE_SPEEDS : [playbackRate], playbackRate)
      if (completion?.status === 'errored') setMessage(completion.error.message)
      if (completion?.status === 'completed' && activeQueueItemId) {
        setCompletedQueueItemId(activeQueueItemId)
      }
    },
    [
      continuousPlayback,
      model.practice,
      model.timeline,
      model.timingProvider,
      playback.engine,
      playback.session,
      practiceIndex,
      playbackRate,
      rampPractice,
      activeQueueItemId,
    ],
  )

  const consumedRequest = useRef<string | undefined>(undefined)
  const legacyIntent = requestedPracticeUnitId
    ? {
        practiceUnitId: requestedPracticeUnitId,
        occurrenceId: practiceIndex.unitsById.get(requestedPracticeUnitId)?.occurrenceIds[0] ?? '',
      }
    : undefined
  const requestedIntent = requestedPracticeIntent ?? legacyIntent
  const requestKey = requestedIntent
    ? `${requestedIntent.practiceUnitId}\u0000${requestedIntent.occurrenceId}`
    : undefined
  useEffect(() => {
    if (!requestedIntent || !requestKey) { consumedRequest.current = undefined; return }
    if (consumedRequest.current === requestKey) return
    const request = requestedIntent
    const timeout = globalThis.setTimeout(() => {
      consumedRequest.current = requestKey
      const unit = practiceIndex.unitsById.get(request.practiceUnitId)
      if (unit && unit.occurrenceIds.includes(request.occurrenceId)) {
        navigatePracticeUnit(unit.id)
        selectOccurrence(request.occurrenceId)
        pendingNavigationRef.current = true
        pendingOccurrenceNavigationRef.current = Boolean(requestedPracticeIntent)
        void playSelection(request.occurrenceId, true)
      } else {
        setMessage('这句目前不属于可用的练习段。')
      }
      onRequestedPracticeIntentConsumed?.()
      onRequestedPracticeUnitConsumed?.()
    }, 0)
    return () => globalThis.clearTimeout(timeout)
  }, [requestKey, requestedIntent, requestedPracticeIntent, practiceIndex, navigatePracticeUnit, selectOccurrence, playSelection, onRequestedPracticeIntentConsumed, onRequestedPracticeUnitConsumed])

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
    if (playback.session?.canResumePractice()) {
      void playback.session.resumePractice().then(completion => {
        if (completion.status === 'errored') setMessage(completion.error.message)
      })
    } else void playSelection(currentOccurrence.occurrence.id)
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
    playback.session?.setRate(nextSpeed)
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
  const audibleCurrentOccurrenceId =
    followsPlayback &&
    primaryOccurrenceId &&
    currentUnit.occurrenceIds.includes(primaryOccurrenceId)
      ? primaryOccurrenceId
      : undefined
  // Learning State remains the manual selection. During a playback gap, only
  // a resolver-adjacent pair inside this Unit may keep the previous lyric visible.
  const playbackGapOccurrenceId =
    followsPlayback &&
    !primaryOccurrenceId &&
    playback.resolution.previousOccurrence &&
    currentUnit.occurrenceIds.includes(
      playback.resolution.previousOccurrence.id,
    ) &&
    playback.resolution.nextOccurrence &&
    currentUnit.occurrenceIds.includes(
      playback.resolution.nextOccurrence.id,
    )
      ? playback.resolution.previousOccurrence.id
      : undefined
  const visibleCurrentOccurrenceId =
    followsPlayback
      ? audibleCurrentOccurrenceId ?? playbackGapOccurrenceId
      : currentOccurrence.occurrence.id
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
      data-lyric-size={preferences.textSize}
    >
      <div className="practice-layout">
        <div className="practice-lyrics-column">
          <section className="practice-lyrics" aria-labelledby="practice-unit-title">
            <header className="practice-unit-heading" ref={lyricsAnchorRef}>
              <div>
                <p className="eyebrow">当前学习段 / {String(unitIndex + 1).padStart(2, '0')}</p>
                <h2 id="practice-unit-title">{currentUnit.label}</h2>
              </div>
              <div className="practice-unit-heading-tools">
                <p className="practice-unit-count">
                  {currentOccurrenceIndex + 1} / {currentUnitOccurrences.length} 句
                </p>
                <LyricDisplayPreferencesControls
                  onBeforeChange={preserveLyricAnchor}
                />
              </div>
            </header>
            <ol className="practice-lyric-list">
              {currentUnitOccurrences.map((assembledOccurrence, index) => (
                <PracticeLyricRow
                  key={assembledOccurrence.occurrence.id}
                  assembledOccurrence={assembledOccurrence}
                  lyricNumber={index + 1}
                  isCurrent={assembledOccurrence.occurrence.id === visibleCurrentOccurrenceId}
                  translationVisible={preferences.translationVisible}
                  romajiVisible={preferences.romajiVisible}
                  onPlay={() => handleOccurrenceClick(assembledOccurrence.occurrence.id)}
                  onShowRelatedExplain={onShowRelatedExplain}
                  createTimingDebuggerHref={createTimingDebuggerHref}
                  onAddToQueue={onAddToQueue}
                />
              ))}
            </ol>
          </section>
        </div>

      </div>

      <aside
        ref={dockRef}
        className="practice-controls practice-dock"
        aria-label="练习控制"
        data-more-controls-expanded={moreControlsExpanded}
      >
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
          <button
            className="practice-player-button practice-play-button"
            type="button"
            onClick={togglePlayback}
            disabled={!playback.engine}
          >
            {playback.audioState.status === 'playing' ? '暂停' : '播放'}
          </button>
          <button
            className="practice-player-button practice-dock-more-toggle"
            type="button"
            aria-expanded={moreControlsExpanded}
            aria-controls="practice-dock-more-controls"
            aria-label={`更多控制，当前速度 ${playbackRate.toFixed(2)} 倍，连续播放${continuousPlayback ? '开启' : '关闭'}，渐速练习${rampPractice ? '开启' : '关闭'}`}
            onClick={() => setMoreControlsExpanded((value) => !value)}
          >
            <span>更多</span>
            <span className="practice-dock-more-status" aria-hidden="true">
              {playbackRate.toFixed(2)}× · {continuousPlayback ? '连续' : '单句'}{rampPractice ? ' · 渐速' : ''}
            </span>
          </button>
        </div>
        <div
          id="practice-dock-more-controls"
          className="practice-dock-secondary"
          data-expanded={moreControlsExpanded}
        >
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
          <div className="practice-dock-modes">
            <button className="practice-player-button practice-mode-button" type="button" disabled={!playback.engine} onClick={() => currentOccurrence && void playSelection(currentOccurrence.occurrence.id)}>
              重播
            </button>
            <button
              className="practice-player-button practice-mode-button"
              type="button"
              aria-pressed={continuousPlayback}
              onClick={() => { playback.session?.cancelPractice(); setContinuousPlayback((value) => !value) }}
            >
              连续播放
            </button>
            <button
              className="practice-player-button practice-mode-button"
              type="button"
              aria-pressed={rampPractice}
              aria-describedby="practice-ramp-explanation"
              onClick={() => { playback.session?.cancelPractice(); setRampPractice((value) => !value) }}
            >
              渐速练习
            </button>
          </div>
        </div>
        <p id="practice-ramp-explanation" className="practice-sr-only">
          开启渐速练习时，播放会按 0.60x、0.80x、1.00x 依次进行；速度按钮仍可设置关闭渐速后的播放速度。
        </p>
        {message ? <p className="practice-message" role="status">{message}</p> : null}
        {activeQueueItemId && completedQueueItemId === activeQueueItemId ? (
          <div className="practice-queue-completion" role="status">
            <p>本次有界练习已自然结束。待练标记仍保留。</p>
            <button type="button" onClick={() => {
              setCompletedQueueItemId(undefined)
              if (currentOccurrence) void playSelection(currentOccurrence.occurrence.id)
            }}>再练这句</button>
            {nextQueueHref ? <a href={nextQueueHref}>下一条待练</a> : null}
            <button type="button" onClick={() => setCompletedQueueItemId(undefined)}>稍后练</button>
          </div>
        ) : null}
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
  translationVisible,
  romajiVisible,
  onPlay,
  onShowRelatedExplain,
  createTimingDebuggerHref,
  onAddToQueue,
}: {
  assembledOccurrence: AssembledOccurrence
  lyricNumber: number
  isCurrent: boolean
  translationVisible: boolean
  romajiVisible: boolean
  onPlay: () => void
  onShowRelatedExplain?: (occurrenceId: string, segmentId: string) => void
  createTimingDebuggerHref?: (occurrenceId: string) => string
  onAddToQueue?: (occurrence: AssembledOccurrence) => 'added' | 'duplicate' | 'full' | 'unavailable'
}) {
  const { occurrence, segment } = assembledOccurrence
  const visibleLayers = visibleLyricLayers(segment.layers, romajiVisible)
  const [queueFeedback, setQueueFeedback] = useState<string>()
  return (
    <li
      className={`practice-lyric-row${isCurrent ? ' is-current' : ''}`}
      data-occurrence-id={occurrence.id}
      data-reading-anchor-id={occurrence.id}
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
        {translationVisible ? (
          <p className="practice-translation">{segment.translation}</p>
        ) : null}
        {visibleLayers?.length ? (
          <div className="practice-readings" aria-label="读音">
            {visibleLayers.map((layer) => (
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
        {isCurrent ? (
          <div className="practice-lyric-context-actions" aria-label="当前句操作">
            {onShowRelatedExplain ? (
              <button type="button" onClick={() => onShowRelatedExplain(occurrence.id, segment.id)}>
                看相关讲解
              </button>
            ) : null}
            {createTimingDebuggerHref ? (
              <a href={createTimingDebuggerHref(occurrence.id)}>校准这句</a>
            ) : null}
            {onAddToQueue ? (
              <button
                type="button"
                onClick={() => setQueueFeedback(queueResultLabel(onAddToQueue(assembledOccurrence)))}
              >
                加入待练
              </button>
            ) : null}
          </div>
        ) : null}
        {queueFeedback ? <p className="practice-queue-feedback" role="status">{queueFeedback}</p> : null}
      </div>
    </li>
  )
}

function loadSafeLearningState(
  model: AssembledSongEdition,
  practiceIndex: PracticeIndex,
  initialTarget?: { practiceUnitId: string; occurrenceId: string },
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
    const state = loadPracticeLearningState(
      model.edition.song.songId,
      model.practice,
      model.timeline,
    )
    if (
      initialTarget &&
      practiceIndex.unitIdByOccurrenceId.get(initialTarget.occurrenceId) === initialTarget.practiceUnitId
    ) {
      return {
        ...state,
        practiceUnitId: initialTarget.practiceUnitId,
        currentOccurrenceId: initialTarget.occurrenceId,
      }
    }
    return state
  } catch {
    return createInitialPracticeState(practiceIndex)
  }
}

function queueResultLabel(result: 'added' | 'duplicate' | 'full' | 'unavailable'): string {
  return result === 'added'
    ? '已加入待练。'
    : result === 'duplicate'
      ? '这句已在待练队列中。'
      : result === 'full'
        ? '待练队列已满，请先移除一项。'
        : '暂时无法保存待练项目；本机原有数据已保留。'
}

function normalizePracticeSpeed(value: number): PracticeSpeed {
  return PRACTICE_SPEEDS.includes(value as PracticeSpeed)
    ? (value as PracticeSpeed)
    : 1
}
