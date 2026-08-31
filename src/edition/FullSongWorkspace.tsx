import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_PLAYBACK_RATE,
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
  readPracticePlaybackRate,
  savePracticePlaybackRate,
} from '../practice/practice-rate'
import { useAudioProgress } from './use-audio-progress'
import { LyricText } from './LyricText'
import { useSongEditionPlayback } from './use-song-edition-playback'

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
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string>()
  const [selectedSectionId, setSelectedSectionId] = useState<string>()
  const [followLyrics, setFollowLyrics] = useState(true)
  const [message, setMessage] = useState<string>()
  const [skipAutoFollowOccurrenceId, setSkipAutoFollowOccurrenceId] =
    useState<string>()
  const [pendingPlaybackStartOccurrenceId, setPendingPlaybackStartOccurrenceId] =
    useState<string>()
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
    [playback],
  )

  const primaryOccurrenceId = playback.resolution.primaryOccurrence?.id
  const isPlaying = playback.audioState.status === 'playing'

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

      void playback.engine
        .playRange({ startMs: section.startMs, endMs: section.endMs })
        .catch((error: unknown) => {
          setMessage(error instanceof Error ? error.message : '器乐段播放失败。')
        })
    },
    [playback.engine],
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
      void playback.engine
        .playRangeUntilComplete(
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
    [model.timingProvider, playback.engine],
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
      playback.engine.pause()
      void playback.engine.seek(0).catch(() => undefined)
    }
    scrollToTop()
  }, [playback.engine, scrollToTop])

  return (
    <section
      className="full-song-workspace"
      aria-label="全曲歌词"
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
          onManualBrowse={() => {
            setSkipAutoFollowOccurrenceId(undefined)
            setPendingPlaybackStartOccurrenceId(undefined)
            setFollowLyrics(false)
          }}
          suppressAutoFollowOccurrenceId={skipAutoFollowOccurrenceId}
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
    if (!element || typeof element.scrollIntoView !== 'function') {
      return
    }

    element.scrollIntoView({
      block: 'center',
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
  hasPracticeUnit: boolean
  refCallback: (element: HTMLElement | null) => void
  onSelect: (occurrence: AssembledOccurrence) => void
  onReplay: (occurrence: AssembledOccurrence) => void
  onStartPractice?: (occurrence: AssembledOccurrence) => void
}) {
  const { occurrence, segment } = assembledOccurrence
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
        <p className="full-song-translation">{segment.translation}</p>
        {segment.layers?.length ? (
          <div className="full-song-reading" aria-label="读音">
            {segment.layers.map((layer) => (
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
  sectionLabel,
  onScrollToTop,
  onReset,
}: {
  model: AssembledSongEdition
  engine: AudioEngine | null
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

  useEffect(() => {
    if (!engine) {
      return
    }

    try {
      engine.setPlaybackRate(
        readPracticePlaybackRate(model.edition.song.songId),
      )
    } catch {
      engine.setPlaybackRate(DEFAULT_PLAYBACK_RATE)
    }
  }, [engine, model.edition.song.songId])

  const togglePlayback = (): void => {
    if (!engine) {
      return
    }

    if (isPlaying) {
      engine.pause()
      return
    }

    void engine.playContinuous().catch(() => undefined)
  }

  const seek = (timeMs: number): void => {
    if (!engine || durationMs <= 0) {
      return
    }
    void engine.seek(Math.min(Math.max(0, timeMs), durationMs)).catch(() => undefined)
  }

  const setRate = (rate: (typeof PRACTICE_PLAYBACK_RATES)[number]): void => {
    if (!engine) {
      return
    }
    engine.setPlaybackRate(rate)
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
