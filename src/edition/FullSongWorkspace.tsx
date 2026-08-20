import { useCallback, useMemo, useState } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import type { RuntimeClient } from '../runtime/runtime-client'
import type {
  AssembledOccurrence,
  AssembledSongEdition,
} from '../runtime/song-edition'
import {
  createPracticeIndex,
  type PracticeIndex,
} from '../practice/practice-scope'
import {
  createEffectivePracticeTimingProvider,
  readTimingOverrides,
  type TimingOverrideIdentity,
} from '../practice/practice-timing-overrides'
import type { EditionTheme } from '../theme/theme-preference'
import { getSectionCue, resolveArtDirection } from '../theme/art-direction'
import { useSongEditionPlayback } from './use-song-edition-playback'

export interface FullSongWorkspaceProps {
  model: AssembledSongEdition
  runtimeClient: RuntimeClient
  audioEngine?: AudioEngine
  theme?: EditionTheme
  onStartPracticeUnit?: (practiceUnitId: string) => void
}

export function FullSongWorkspace({
  model,
  runtimeClient,
  audioEngine,
  theme = 'liner',
  onStartPracticeUnit,
}: FullSongWorkspaceProps) {
  const playback = useSongEditionPlayback(model, runtimeClient, audioEngine)
  const [readingVisible, setReadingVisible] = useState(false)
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string>()
  const [message, setMessage] = useState<string>()
  const practiceIndex = useMemo(
    () => createPracticeIndex(model.practice, model.timeline),
    [model.practice, model.timeline],
  )
  const timingIdentity = useMemo<TimingOverrideIdentity>(
    () => ({
      songId: model.edition.song.songId,
      audioSourceHash: model.edition.audio.sourceHash,
      baseTimelineUrl: model.edition.timelineUrl,
    }),
    [
      model.edition.audio.sourceHash,
      model.edition.song.songId,
      model.edition.timelineUrl,
    ],
  )
  const timingOverrides = useMemo(() => {
    const result = readTimingOverrides(timingIdentity, {
      occurrences: model.timeline.occurrences,
    })
    return result.kind === 'compatible' ? result.document : undefined
  }, [model.timeline.occurrences, timingIdentity])
  const timingProvider = useMemo(
    () =>
      createEffectivePracticeTimingProvider(model.timeline, timingOverrides),
    [model.timeline, timingOverrides],
  )
  const artDirection = useMemo(
    () => resolveArtDirection(model.edition.song.songId, model.visual, theme),
    [model.edition.song.songId, model.visual, theme],
  )

  const handleSelectOccurrence = useCallback(
    (assembledOccurrence: AssembledOccurrence): void => {
      setSelectedOccurrenceId(assembledOccurrence.occurrence.id)
      setMessage(undefined)
      const timing = timingProvider.getTiming(assembledOccurrence.occurrence)
      playback.playOccurrenceContinuously?.(assembledOccurrence, timing.playStartMs)
    },
    [playback, timingProvider],
  )

  const handleReplayOccurrence = useCallback(
    (assembledOccurrence: AssembledOccurrence): void => {
      setSelectedOccurrenceId(assembledOccurrence.occurrence.id)
      const timing = timingProvider.getTiming(assembledOccurrence.occurrence)
      if (!playback.engine) {
        setMessage('当前环境无法播放音频。')
        return
      }

      setMessage(undefined)
      void playback.engine
        .playRangeUntilComplete(
          {
            startMs: timing.playStartMs,
            endMs: timing.playEndMs,
          },
          assembledOccurrence.occurrence.id,
        )
        .then((completion) => {
          if (completion.status === 'errored') {
            setMessage(completion.error.message)
          }
        })
    },
    [playback.engine, timingProvider],
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
  const primaryOccurrenceId = playback.resolution.primaryOccurrence?.id

  return (
    <section
      className="full-song-workspace"
      aria-label="Full song lyrics"
      data-theme={theme}
      data-current-section-id={playback.resolution.currentSection?.id}
      data-selected-occurrence-id={selectedOccurrenceId}
    >
      <div className="full-song-heading">
        <div>
          <p className="eyebrow">FULL SONG / LYRICS</p>
          <h2>跟着整首歌走。</h2>
        </div>
        <button
          className="full-song-reading-toggle"
          type="button"
          aria-pressed={readingVisible}
          onClick={() => setReadingVisible((visible) => !visible)}
        >
          {readingVisible ? '隐藏读音' : '显示读音'}
        </button>
      </div>

      <FullSongLyrics
        model={model}
        artDirection={artDirection}
        activeOccurrenceIds={activeOccurrenceIds}
        primaryOccurrenceId={primaryOccurrenceId}
        selectedOccurrenceId={selectedOccurrenceId}
        readingVisible={readingVisible}
        practiceIndex={practiceIndex}
        onSelectOccurrence={handleSelectOccurrence}
        onReplayOccurrence={handleReplayOccurrence}
        onStartPracticeUnit={
          onStartPracticeUnit ? handleStartPractice : undefined
        }
      />
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
  artDirection: ReturnType<typeof resolveArtDirection>
  activeOccurrenceIds: ReadonlySet<string>
  primaryOccurrenceId?: string
  selectedOccurrenceId?: string
  readingVisible: boolean
  practiceIndex: PracticeIndex
  onSelectOccurrence: (occurrence: AssembledOccurrence) => void
  onReplayOccurrence: (occurrence: AssembledOccurrence) => void
  onStartPracticeUnit?: (occurrence: AssembledOccurrence) => void
}

function FullSongLyrics({
  model,
  artDirection,
  activeOccurrenceIds,
  primaryOccurrenceId,
  selectedOccurrenceId,
  readingVisible,
  practiceIndex,
  onSelectOccurrence,
  onReplayOccurrence,
  onStartPracticeUnit,
}: FullSongLyricsProps) {
  return (
    <div className="full-song-lyrics-stream">
      {model.sections.map(({ section, occurrences }, sectionIndex) => (
        <section
          className="full-song-section"
          key={section.id}
          aria-labelledby={`full-song-section-${section.id}`}
          data-section-id={section.id}
          data-section-cue={getSectionCue(artDirection, section.id)}
        >
          <div className="full-song-section-heading">
            <span className="full-song-section-index" aria-hidden="true">
              {String(sectionIndex + 1).padStart(2, '0')}
            </span>
            <h3 id={`full-song-section-${section.id}`}>{section.label}</h3>
          </div>

          {occurrences.length === 0 ? (
            <p className="full-song-instrumental-marker">
              <span aria-hidden="true" />
              器乐段
            </p>
          ) : (
            <div className="full-song-occurrence-list">
              {occurrences.map((assembledOccurrence) => (
                <FullSongOccurrence
                  key={assembledOccurrence.occurrence.id}
                  assembledOccurrence={assembledOccurrence}
                  activeOccurrenceIds={activeOccurrenceIds}
                  primaryOccurrenceId={primaryOccurrenceId}
                  selectedOccurrenceId={selectedOccurrenceId}
                  readingVisible={readingVisible}
                  hasPracticeUnit={practiceIndex.unitIdByOccurrenceId.has(
                    assembledOccurrence.occurrence.id,
                  )}
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
  readingVisible,
  hasPracticeUnit,
  onSelect,
  onReplay,
  onStartPractice,
}: {
  assembledOccurrence: AssembledOccurrence
  activeOccurrenceIds: ReadonlySet<string>
  primaryOccurrenceId?: string
  selectedOccurrenceId?: string
  readingVisible: boolean
  hasPracticeUnit: boolean
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
      className={className}
      data-occurrence-id={occurrence.id}
      data-active-kind={isPrimary ? 'primary' : isActive ? 'secondary' : 'none'}
      aria-current={isPrimary ? 'true' : undefined}
    >
      <button
        className="full-song-original"
        type="button"
        aria-label={`从这里连续播放：${segment.lyrics}`}
        onClick={() => onSelect(assembledOccurrence)}
      >
        {segment.lyrics}
      </button>
      <p className="full-song-translation">{segment.translation}</p>
      {readingVisible && segment.layers?.length ? (
        <div className="full-song-reading" aria-label="读音">
          {segment.layers.map((layer) => (
            <p key={layer.id}>
              <span>{layer.label}</span>
              {layer.text}
            </p>
          ))}
        </div>
      ) : null}
      {isSelected ? (
        <div className="full-song-quick-actions" aria-label="当前句操作">
          <button type="button" onClick={() => onReplay(assembledOccurrence)}>
            再听这句
          </button>
          {hasPracticeUnit && onStartPractice ? (
            <button
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
