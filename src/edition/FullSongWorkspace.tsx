import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type AudioEngine,
} from '../audio/audio-engine'
import type { RuntimeClient } from '../runtime/runtime-client'
import type {
  AssembledOccurrence,
  AssembledSongEdition,
} from '../runtime/song-edition'
import type { Section } from '../library/schema'
import {
  createPracticeIndex,
  type PracticeIndex,
} from '../practice/practice-scope'
import {
  PRACTICE_PLAYBACK_RATES,
  savePracticePlaybackRate,
} from '../practice/practice-rate'
import { useAudioProgress } from './use-audio-progress'
import { LyricText } from './LyricText'
import { useSongEditionPlayback } from './use-song-edition-playback'
import { useSessionViewState } from './song-playback-context'
import type { SongPlaybackSession } from './song-playback-session'
import {
  LyricDisplayPreferencesControls,
  useLyricAnchorPreservation,
  useLyricDisplayPreferences,
  visibleLyricLayers,
} from './LyricDisplayPreferences'

export interface FullSongWorkspaceProps {
  model: AssembledSongEdition
  runtimeClient: RuntimeClient
  audioEngine?: AudioEngine
  onStartPracticeUnit?: (practiceUnitId: string) => void
}

export function FullSongWorkspace({
  model,
  runtimeClient,
  audioEngine,
  onStartPracticeUnit,
}: FullSongWorkspaceProps) {
  const playback = useSongEditionPlayback(model, runtimeClient, audioEngine)
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useSessionViewState<string | undefined>('full.occurrence', undefined)
  const [selectedSectionId, setSelectedSectionId] = useSessionViewState<string | undefined>('full.section', undefined)
  const [followLyrics, setFollowLyrics] = useSessionViewState('full.follow', true)
  const [hasVisitedFullSong, setHasVisitedFullSong] = useSessionViewState('full.hasVisited', false)
  const [message, setMessage] = useState<string>()
  const [skipAutoFollowOccurrenceId, setSkipAutoFollowOccurrenceId] = useState<
    string | undefined
  >(() => hasVisitedFullSong ? playback.resolution.primaryOccurrence?.id : undefined)
  const [pendingPlaybackStartOccurrenceId, setPendingPlaybackStartOccurrenceId] =
    useState<string>()
  const workspaceRef = useRef<HTMLElement | null>(null)
  const { preferences } = useLyricDisplayPreferences()
  const preserveLyricAnchor = useLyricAnchorPreservation(
    workspaceRef,
    preferences,
  )
  const practiceIndex = useMemo(
    () => createPracticeIndex(model.practice, model.timeline),
    [model.practice, model.timeline],
  )
  const handleSelectOccurrence = useCallback(
    (assembledOccurrence: AssembledOccurrence): void => {
      setSelectedOccurrenceId(assembledOccurrence.occurrence.id)
      setSelectedSectionId(undefined)
      setSkipAutoFollowOccurrenceId(assembledOccurrence.occurrence.id)
      setPendingPlaybackStartOccurrenceId(assembledOccurrence.occurrence.id)
      setFollowLyrics(true)
      setMessage(undefined)
      playback.playOccurrenceContinuously?.(assembledOccurrence)
    },
    [playback, setFollowLyrics, setSelectedOccurrenceId, setSelectedSectionId],
  )

  const primaryOccurrenceId = playback.resolution.primaryOccurrence?.id
  const isPlaying = playback.audioState.status === 'playing'

  useEffect(() => {
    if (!hasVisitedFullSong) setHasVisitedFullSong(true)
  }, [hasVisitedFullSong, setHasVisitedFullSong])

  const stopFollowingLyrics = useCallback((): void => {
    setSkipAutoFollowOccurrenceId(undefined)
    setPendingPlaybackStartOccurrenceId(undefined)
    setFollowLyrics(false)
  }, [setFollowLyrics])

  useEffect(() => {
    const scrollKeys = new Set([
      'ArrowDown',
      'ArrowUp',
      'PageDown',
      'PageUp',
      'Home',
      'End',
      ' ',
    ])
    const pageScrollKeys = new Set([
      'ArrowDown',
      'ArrowUp',
      'PageDown',
      'PageUp',
      'Home',
      'End',
    ])
    const isInteractiveTarget = (target: EventTarget | null): boolean =>
      target instanceof Element &&
      Boolean(
        target.closest(
          'a, button, input, select, textarea, summary, [contenteditable="true"]',
        ),
      )
    const isTextEntryTarget = (target: EventTarget | null): boolean =>
      target instanceof Element &&
      Boolean(target.closest('input, select, textarea, [contenteditable="true"]'))
    const onKeyDown = (event: KeyboardEvent): void => {
      const shouldTrackPageScroll =
        pageScrollKeys.has(event.key)
          ? !isTextEntryTarget(event.target)
          : !isInteractiveTarget(event.target)
      if (scrollKeys.has(event.key) && shouldTrackPageScroll) {
        stopFollowingLyrics()
      }
    }
    const onPointerDown = (event: PointerEvent): void => {
      if (isInteractiveTarget(event.target)) return
      const root = document.documentElement
      const scrollbarWidth = window.innerWidth - root.clientWidth
      const scrollbarStart = scrollbarWidth > 0 ? root.clientWidth : window.innerWidth - 12
      if (event.clientX >= scrollbarStart) stopFollowingLyrics()
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [stopFollowingLyrics])

  const handleSelectSection = useCallback(
    (section: Section): void => {
      setSelectedSectionId(section.id)
      setSelectedOccurrenceId(undefined)
      setSkipAutoFollowOccurrenceId(undefined)
      setPendingPlaybackStartOccurrenceId(undefined)
      setFollowLyrics(true)
      setMessage(undefined)
      if (!playback.engine) {
        setMessage('当前环境无法播放音频。')
        return
      }

      void playback.session
        ?.playBounded({ startMs: section.startMs, endMs: section.endMs })
        .then((completion) => {
          if (completion.status === 'errored') setMessage(completion.error.message)
        })
    },
    [playback.engine, playback.session, setFollowLyrics, setSelectedOccurrenceId, setSelectedSectionId],
  )

  const handleReplayOccurrence = useCallback(
    (assembledOccurrence: AssembledOccurrence): void => {
      setSelectedOccurrenceId(assembledOccurrence.occurrence.id)
      setSelectedSectionId(undefined)
      setSkipAutoFollowOccurrenceId(assembledOccurrence.occurrence.id)
      setPendingPlaybackStartOccurrenceId(assembledOccurrence.occurrence.id)
      setFollowLyrics(true)
      if (!playback.engine) {
        setMessage('当前环境无法播放音频。')
        return
      }

      setMessage(undefined)
      const timing = model.timingProvider.getTiming(assembledOccurrence.occurrence)
      void playback.session
        ?.playBounded(
          {
            startMs: timing.startMs,
            endMs: timing.endMs,
          },
          assembledOccurrence.occurrence.id,
        )
        .then((completion) => {
          if (completion.status === 'errored') {
            setMessage(completion.error.message)
          }
        })
    },
    [model.timingProvider, playback.engine, playback.session, setFollowLyrics, setSelectedOccurrenceId, setSelectedSectionId],
  )

  const handleStartPractice = useCallback(
    (assembledOccurrence: AssembledOccurrence): void => {
      const practiceUnitId = practiceIndex.unitIdByOccurrenceId.get(
        assembledOccurrence.occurrence.id,
      )
      if (practiceUnitId) {
        onStartPracticeUnit?.(practiceUnitId)
      }
    },
    [onStartPracticeUnit, practiceIndex],
  )

  const activeOccurrenceIds = useMemo(
    () => new Set(playback.resolution.activeOccurrences.map(({ id }) => id)),
    [playback.resolution.activeOccurrences],
  )

  const currentSectionId = playback.resolution.currentSection?.id
  const currentSectionHasLyrics = Boolean(
    currentSectionId && model.occurrencesBySectionId[currentSectionId]?.length,
  )
  // Manual selection is intentionally not the playback fallback. A lyric is
  // bridged only when Resolver identifies an adjacent pair in this lyric Section.
  const playbackGapOccurrenceId =
    isPlaying &&
    followLyrics &&
    !primaryOccurrenceId &&
    currentSectionHasLyrics &&
    playback.resolution.previousOccurrence &&
    playback.resolution.previousOccurrence.sectionId === currentSectionId &&
    playback.resolution.nextOccurrence?.sectionId === currentSectionId
      ? playback.resolution.previousOccurrence.id
      : undefined
  // Keep overlap click-start behavior separate from the follow cursor. This
  // applies only while the clicked occurrence is still active.
  const overlappingClickedOccurrenceId =
    isPlaying &&
    followLyrics &&
    primaryOccurrenceId &&
    pendingPlaybackStartOccurrenceId &&
    selectedOccurrenceId === pendingPlaybackStartOccurrenceId &&
    primaryOccurrenceId !== pendingPlaybackStartOccurrenceId &&
    activeOccurrenceIds.has(pendingPlaybackStartOccurrenceId)
      ? pendingPlaybackStartOccurrenceId
      : undefined
  const visibleSelectedOccurrenceId =
    isPlaying && followLyrics
      ? overlappingClickedOccurrenceId ??
        primaryOccurrenceId ??
        playbackGapOccurrenceId
      : selectedOccurrenceId
  const visibleSelectedSectionId =
    isPlaying && !primaryOccurrenceId
      ? playback.resolution.currentSection?.id
      : selectedSectionId
  const scrollToTop = useCallback((): void => {
    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      })
    }
  }, [])
  const resetPlayback = useCallback((): void => {
    setSelectedOccurrenceId(undefined)
    setSelectedSectionId(undefined)
    setSkipAutoFollowOccurrenceId(undefined)
    setPendingPlaybackStartOccurrenceId(undefined)
    setFollowLyrics(true)
    setMessage(undefined)
    if (playback.engine) {
      playback.session?.pause()
      void playback.session?.seek(0).catch(() => undefined)
    }
    scrollToTop()
  }, [playback.engine, playback.session, scrollToTop, setFollowLyrics, setSelectedOccurrenceId, setSelectedSectionId])

  return (
    <section
      ref={workspaceRef}
      className="full-song-workspace"
      aria-label="全曲歌词"
      data-lyric-size={preferences.textSize}
      data-current-section-id={playback.resolution.currentSection?.id}
      data-selected-occurrence-id={visibleSelectedOccurrenceId}
      data-selected-section-id={visibleSelectedSectionId}
      data-follow-lyrics={followLyrics}
    >
      <div className="full-song-heading">
        <div>
          <p className="eyebrow">全曲</p>
          <h2>跟着整首歌走。</h2>
        </div>
        <div className="full-song-heading-actions">
          <LyricDisplayPreferencesControls
            onBeforeChange={preserveLyricAnchor}
          />
          {!followLyrics ? (
            <button
              className="full-song-return-current"
              type="button"
              onClick={() => {
                setSkipAutoFollowOccurrenceId(undefined)
                setPendingPlaybackStartOccurrenceId(undefined)
                setFollowLyrics(true)
              }}
            >
              回到当前句
            </button>
          ) : null}
        </div>
      </div>

      <div className="full-song-layout">
        <FullSongLyrics
          model={model}
          activeOccurrenceIds={activeOccurrenceIds}
          primaryOccurrenceId={primaryOccurrenceId}
          selectedOccurrenceId={visibleSelectedOccurrenceId}
          selectedSectionId={visibleSelectedSectionId}
          playingSectionId={
            isPlaying && !primaryOccurrenceId
              ? playback.resolution.currentSection?.id
              : undefined
          }
          followLyrics={followLyrics}
          onManualBrowse={stopFollowingLyrics}
          suppressAutoFollowOccurrenceId={skipAutoFollowOccurrenceId}
          translationVisible={preferences.translationVisible}
          romajiVisible={preferences.romajiVisible}
          practiceIndex={practiceIndex}
          onSelectOccurrence={handleSelectOccurrence}
          onReplayOccurrence={handleReplayOccurrence}
          onSelectSection={handleSelectSection}
          onStartPracticeUnit={
            onStartPracticeUnit ? handleStartPractice : undefined
          }
        />
        <FullSongPlayer
          model={model}
          engine={playback.engine}
          session={playback.session}
          sectionLabel={playback.resolution.currentSection?.label ?? '间奏 / 空白'}
          onScrollToTop={scrollToTop}
          onReset={resetPlayback}
        />
      </div>
      {message ? (
        <p className="full-song-message" role="status">
          {message}
        </p>
      ) : null}
    </section>
  )
}

interface FullSongLyricsProps {
  model: AssembledSongEdition
  activeOccurrenceIds: ReadonlySet<string>
  primaryOccurrenceId?: string
  selectedOccurrenceId?: string
  selectedSectionId?: string
  playingSectionId?: string
  followLyrics: boolean
  onManualBrowse: () => void
  suppressAutoFollowOccurrenceId?: string
  translationVisible: boolean
  romajiVisible: boolean
  practiceIndex: PracticeIndex
  onSelectOccurrence: (occurrence: AssembledOccurrence) => void
  onReplayOccurrence: (occurrence: AssembledOccurrence) => void
  onSelectSection: (section: Section) => void
  onStartPracticeUnit?: (occurrence: AssembledOccurrence) => void
}

function FullSongLyrics({
  model,
  activeOccurrenceIds,
  primaryOccurrenceId,
  selectedOccurrenceId,
  selectedSectionId,
  playingSectionId,
  followLyrics,
  onManualBrowse,
  suppressAutoFollowOccurrenceId,
  translationVisible,
  romajiVisible,
  practiceIndex,
  onSelectOccurrence,
  onReplayOccurrence,
  onSelectSection,
  onStartPracticeUnit,
}: FullSongLyricsProps) {
  const occurrenceElements = useRef(new Map<string, HTMLElement>())
  const pendingScrollSuppressionRef = useRef<string | undefined>(undefined)
  const lastScrollSuppressionRequestRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!suppressAutoFollowOccurrenceId) {
      lastScrollSuppressionRequestRef.current = undefined
      pendingScrollSuppressionRef.current = undefined
    } else if (
      lastScrollSuppressionRequestRef.current !== suppressAutoFollowOccurrenceId
    ) {
      lastScrollSuppressionRequestRef.current = suppressAutoFollowOccurrenceId
      pendingScrollSuppressionRef.current = suppressAutoFollowOccurrenceId
    }

    if (!followLyrics || !primaryOccurrenceId) {
      return
    }

    if (pendingScrollSuppressionRef.current) {
      pendingScrollSuppressionRef.current = undefined
      return
    }

    const element = occurrenceElements.current.get(primaryOccurrenceId)
    if (!element) {
      return
    }

    const rect = element.getBoundingClientRect()
    if (rect.height <= 0) return
    const readable = getReadableViewport()
    const margin = 16
    if (
      rect.top >= readable.top + margin &&
      rect.bottom <= readable.bottom - margin
    ) return

    const availableHeight = Math.max(0, readable.bottom - readable.top)
    const desiredTop = rect.height > availableHeight - margin * 2
      ? readable.top + margin
      : readable.top + Math.max(margin, (availableHeight - rect.height) / 2)
    window.scrollTo({
      top: Math.max(0, window.scrollY + rect.top - desiredTop),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }, [followLyrics, primaryOccurrenceId, suppressAutoFollowOccurrenceId])

  return (
    <div
      className="full-song-lyrics-stream"
      onWheel={onManualBrowse}
      onTouchMove={onManualBrowse}
    >
      {model.sections.map(({ section, occurrences }, sectionIndex) => (
        <section
          className={`full-song-section${selectedSectionId === section.id ? ' is-section-selected' : ''}${playingSectionId === section.id ? ' is-section-playing' : ''}`}
          key={section.id}
          aria-labelledby={`full-song-section-${section.id}`}
          data-section-id={section.id}
        >
          <div className="full-song-section-heading">
            <span className="full-song-section-index" aria-hidden="true">
              {String(sectionIndex + 1).padStart(2, '0')}
            </span>
            <h3 id={`full-song-section-${section.id}`}>{section.label}</h3>
          </div>

          {occurrences.length === 0 ? (
            <button
              className={`full-song-instrumental-marker${selectedSectionId === section.id ? ' is-selected' : ''}${playingSectionId === section.id ? ' is-playing' : ''}`}
              type="button"
              aria-pressed={selectedSectionId === section.id}
              aria-label={`播放器乐段：${section.label}`}
              onClick={() => onSelectSection(section)}
            >
              <span className="full-song-instrumental-marker-signal" aria-hidden="true" />
              <span>器乐段</span>
              <span aria-hidden="true"> / </span>
              <span>{section.label}</span>
            </button>
          ) : (
            <div className="full-song-occurrence-list">
              {occurrences.map((assembledOccurrence) => (
                <FullSongOccurrence
                  key={assembledOccurrence.occurrence.id}
                  assembledOccurrence={assembledOccurrence}
                  activeOccurrenceIds={activeOccurrenceIds}
                  primaryOccurrenceId={primaryOccurrenceId}
                  selectedOccurrenceId={selectedOccurrenceId}
                  translationVisible={translationVisible}
                  romajiVisible={romajiVisible}
                  hasPracticeUnit={practiceIndex.unitIdByOccurrenceId.has(
                    assembledOccurrence.occurrence.id,
                  )}
                  refCallback={(element) => {
                    if (element) {
                      occurrenceElements.current.set(
                        assembledOccurrence.occurrence.id,
                        element,
                      )
                    } else {
                      occurrenceElements.current.delete(
                        assembledOccurrence.occurrence.id,
                      )
                    }
                  }}
                  onSelect={onSelectOccurrence}
                  onReplay={onReplayOccurrence}
                  onStartPractice={onStartPracticeUnit}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

function FullSongOccurrence({
  assembledOccurrence,
  activeOccurrenceIds,
  primaryOccurrenceId,
  selectedOccurrenceId,
  translationVisible,
  romajiVisible,
  hasPracticeUnit,
  refCallback,
  onSelect,
  onReplay,
  onStartPractice,
}: {
  assembledOccurrence: AssembledOccurrence
  activeOccurrenceIds: ReadonlySet<string>
  primaryOccurrenceId?: string
  selectedOccurrenceId?: string
  translationVisible: boolean
  romajiVisible: boolean
  hasPracticeUnit: boolean
  refCallback: (element: HTMLElement | null) => void
  onSelect: (occurrence: AssembledOccurrence) => void
  onReplay: (occurrence: AssembledOccurrence) => void
  onStartPractice?: (occurrence: AssembledOccurrence) => void
}) {
  const { occurrence, segment } = assembledOccurrence
  const visibleLayers = visibleLyricLayers(segment.layers, romajiVisible)
  const isActive = activeOccurrenceIds.has(occurrence.id)
  const isPrimary = primaryOccurrenceId === occurrence.id
  const isSelected = selectedOccurrenceId === occurrence.id
  const className = [
    'full-song-occurrence',
    isActive ? 'is-active' : '',
    isPrimary ? 'is-primary-active' : '',
    isActive && !isPrimary ? 'is-secondary-active' : '',
    isSelected ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      ref={refCallback}
      className={className}
      data-occurrence-id={occurrence.id}
      data-reading-anchor-id={occurrence.id}
      data-active-kind={isPrimary ? 'primary' : isActive ? 'secondary' : 'none'}
      aria-current={isPrimary ? 'true' : undefined}
    >
      <div className="full-song-lyric-cluster">
        <button
          className="full-song-original"
          type="button"
          aria-label={`从这里连续播放：${segment.lyrics}`}
          onClick={() => onSelect(assembledOccurrence)}
        >
          <LyricText segment={segment} />
        </button>
        {translationVisible ? (
          <p className="full-song-translation">{segment.translation}</p>
        ) : null}
        {visibleLayers?.length ? (
          <div className="full-song-reading" aria-label="读音">
            {visibleLayers.map((layer) => (
              <p key={layer.id}>
                <span>{layer.label}</span>
                {layer.text}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      {isSelected ? (
        <div className="full-song-quick-actions" aria-label="当前句操作">
          <button className="full-song-quick-action" type="button" onClick={() => onReplay(assembledOccurrence)}>
            再听这句
          </button>
          {hasPracticeUnit && onStartPractice ? (
            <button
              className="full-song-quick-action"
              type="button"
              onClick={() => onStartPractice(assembledOccurrence)}
            >
              开始学这一段 →
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function FullSongPlayer({
  model,
  engine,
  session,
  sectionLabel,
  onScrollToTop,
  onReset,
}: {
  model: AssembledSongEdition
  engine: AudioEngine | null
  session: SongPlaybackSession | null
  sectionLabel: string
  onScrollToTop: () => void
  onReset: () => void
}) {
  const progress = useAudioProgress(engine)
  const durationMs = progress.durationMs ?? model.edition.audio.durationMs
  const currentTimeMs = Math.min(
    Math.max(0, progress.currentTimeMs),
    durationMs,
  )
  const isPlaying = progress.status === 'playing'

  const togglePlayback = (): void => {
    if (!engine) {
      return
    }

    if (isPlaying) {
      session?.pause()
      return
    }

    void session?.playContinuous().catch(() => undefined)
  }

  const seek = (timeMs: number): void => {
    if (!engine || durationMs <= 0) {
      return
    }
    void session?.seek(Math.min(Math.max(0, timeMs), durationMs)).catch(() => undefined)
  }

  const setRate = (rate: (typeof PRACTICE_PLAYBACK_RATES)[number]): void => {
    if (!engine) {
      return
    }
    session?.setRate(rate)
    savePracticePlaybackRate(model.edition.song.songId, rate)
  }

  return (
    <aside className="full-song-player" aria-label="全曲播放器">
      <div className="full-song-player-topline">
        <span>全曲播放</span>
        <span>
          {formatPlayerTime(currentTimeMs)} / {formatPlayerTime(durationMs)}
        </span>
      </div>
      <input
        className="full-song-player-progress"
        type="range"
        min="0"
        max={durationMs}
        step="100"
        value={currentTimeMs}
        aria-label="播放进度"
        disabled={!engine || durationMs <= 0}
        onChange={(event) => seek(Number(event.currentTarget.value))}
      />
      <div className="full-song-player-context">
        <span>当前段：{sectionLabel}</span>
      </div>
      <div className="full-song-player-speed" aria-label="播放速度">
        {PRACTICE_PLAYBACK_RATES.map((rate) => (
          <button
            key={rate}
            className="full-song-player-speed-button"
            type="button"
            aria-label={`设置速度 ${rate.toFixed(2)}x`}
            aria-pressed={progress.playbackRate === rate}
            onClick={() => setRate(rate)}
            disabled={!engine}
          >
            {rate.toFixed(2)}x
          </button>
        ))}
        <button
          className="full-song-player-toggle"
          type="button"
          onClick={togglePlayback}
          disabled={!engine}
        >
          {isPlaying ? '暂停' : '播放'}
        </button>
      </div>
      <div className="full-song-player-actions">
        <button className="full-song-player-action" type="button" onClick={onScrollToTop}>
          回到顶部
        </button>
        <button className="full-song-player-action" type="button" onClick={onReset}>
          重置
        </button>
      </div>
    </aside>
  )
}

function getReadableViewport(): { top: number; bottom: number } {
  const visualHeight = Math.min(
    window.innerHeight,
    window.visualViewport?.height ?? window.innerHeight,
  )
  let top = 0
  const nav = document.querySelector<HTMLElement>('.practice-page-tools')
  if (nav) {
    const rect = nav.getBoundingClientRect()
    const stickyTop = Number.parseFloat(getComputedStyle(nav).top) || 0
    if (rect.top <= stickyTop + 1 && rect.bottom > 0) {
      top = Math.max(0, rect.bottom)
    }
  }

  let bottom = visualHeight
  const player = document.querySelector<HTMLElement>('.full-song-player')
  if (player && getComputedStyle(player).position === 'fixed') {
    const playerTop = player.getBoundingClientRect().top
    if (playerTop > 0) bottom = Math.min(bottom, playerTop)
  }
  return { top, bottom: Math.max(top, bottom) }
}

function formatPlayerTime(timeMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, timeMs) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
