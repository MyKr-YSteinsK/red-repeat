import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getAudioEngine } from '../audio/audio-engine'
import type { RuntimeSongEditionCore } from '../runtime/song-edition-loader'
import { SongPlaybackSession } from './song-playback-session'
import { SongPlaybackContext } from './song-playback-context'
import { LyricDisplayPreferencesProvider } from './LyricDisplayPreferences'
import { readPracticePlaybackRate } from '../practice/practice-rate'
import { createPracticeIndex } from '../practice/practice-scope'
import {
  isResumeIdentityCompatible,
  readResumeContext,
  saveResumeContext,
  type ResumeContext,
  type ResumeMode,
} from '../practice/resume-context'
import { addPracticeQueueItem, readPracticeQueueStatus } from '../practice/practice-queue'
import type { PracticeQueueItem } from '../practice/practice-queue'
import { createPracticeQueueHref } from '../navigation'
import { readPracticeResumeMetadata } from '../practice/practice-state'
import type { AudioEngine } from '../audio/audio-engine'
import type { CatalogEdition } from '../library/runtime-schema'
import {
  RuntimeClient,
  RuntimeClientError,
} from '../runtime/runtime-client'
import { FullSongWorkspace } from './FullSongWorkspace'
import { PracticeWorkspace } from './PracticeWorkspace'
import { ExplainWorkspace } from './ExplainWorkspace'
import { useSongEditionCore, type PreparedSongEditionLoad } from './use-song-edition-core'

type SongEditionTab = ResumeMode

interface PracticeNavigationIntent {
  practiceUnitId: string
  occurrenceId: string
}

interface RelatedExplainIntent {
  segmentId: string
  occurrenceId: string
}

interface ResumePracticeTarget {
  practiceUnitId: string
  occurrenceId: string
}

export interface SongEditionPageProps {
  catalogEdition: CatalogEdition
  runtimeClient: RuntimeClient
  homeHref: string
  audioEngine?: AudioEngine
  preparedLoad?: PreparedSongEditionLoad
  continueLastRequested?: boolean
  practiceQueueItemId?: string
}

export function SongEditionPage({
  catalogEdition,
  runtimeClient,
  homeHref,
  audioEngine,
  preparedLoad,
  continueLastRequested,
  practiceQueueItemId,
}: SongEditionPageProps) {
  const [retryKey, setRetryKey] = useState(0)
  const state = useSongEditionCore(runtimeClient, catalogEdition, retryKey, preparedLoad)

  if (state.status === 'loading') {
    return <SongEditionStatus homeHref={homeHref} />
  }

  if (state.status === 'error') {
    return (
        <main
          className="song-edition song-edition-status"
          aria-labelledby="song-title"
          role="alert"
        >
          <p className="eyebrow">歌曲 / 错误</p>
          <h1 id="song-title">歌曲暂时无法打开</h1>
          <p className="song-status-copy">无法读取这首歌的内容，请重试。</p>
          <p className="song-status-detail">{describeEditionError(state.error)}</p>
          <div className="song-status-actions">
            <button
              className="text-button"
              type="button"
              onClick={() => setRetryKey((value) => value + 1)}
            >
              重试
            </button>
            <a className="text-link" href={homeHref}>
              返回曲库
            </a>
          </div>
        </main>
    )
  }

  const entry = resolveEntryContext(state.core, continueLastRequested, practiceQueueItemId)

  return (
    <ReadySongEdition
      key={playbackIdentity(state.core.edition)}
      core={state.core}
      runtimeClient={runtimeClient}
      homeHref={homeHref}
      audioEngine={audioEngine}
      initialTab={entry.tab}
      initialPracticeTarget={entry.practiceTarget}
      initialFullSongOccurrenceId={entry.fullSongOccurrenceId}
      initialExplainFeatureId={entry.explainFeatureId}
      entryMessage={entry.message}
      activeQueueItemId={entry.activeQueueItemId}
      nextQueueItem={entry.nextQueueItem}
    />
  )
}

function ReadySongEdition({ core, runtimeClient, homeHref, audioEngine, initialTab,
  initialPracticeTarget, initialFullSongOccurrenceId, initialExplainFeatureId,
  entryMessage, activeQueueItemId, nextQueueItem,
}: {
  core: RuntimeSongEditionCore
  runtimeClient: RuntimeClient
  homeHref: string
  audioEngine?: AudioEngine
  initialTab: SongEditionTab
  initialPracticeTarget?: ResumePracticeTarget
  initialFullSongOccurrenceId?: string
  initialExplainFeatureId?: string
  entryMessage?: string
  activeQueueItemId?: string
  nextQueueItem?: PracticeQueueItem
}) {
  const [tab, setTab] = useState<SongEditionTab>(initialTab)
  const [practiceNavigationRequest, setPracticeNavigationRequest] = useState<PracticeNavigationIntent | undefined>()
  const [relatedExplainIntent, setRelatedExplainIntent] = useState<RelatedExplainIntent | undefined>()
  const [explainSourceMode, setExplainSourceMode] = useState<Exclude<SongEditionTab, 'explain'> | undefined>()
  const [coverViewerOpen, setCoverViewerOpen] = useState(false)
  const coverTriggerRef = useRef<HTMLButtonElement | null>(null)
  const coverViewerRef = useRef<HTMLDivElement | null>(null)
  const coverViewerWasOpenRef = useRef(false)

  useEffect(() => {
    if (!coverViewerOpen) {
      if (coverViewerWasOpenRef.current) {
        coverViewerWasOpenRef.current = false
        coverTriggerRef.current?.focus()
      }
      return
    }

    coverViewerWasOpenRef.current = true
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setCoverViewerOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    coverViewerRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [coverViewerOpen])

  const engine = audioEngine ?? (typeof Audio === 'undefined' ? null : getAudioEngine())
  const sourceUrl = runtimeClient.resolveAsset(core.edition.audio.url)
  const identity = playbackIdentity(core.edition)
  const session = useMemo(
    () => engine ? new SongPlaybackSession(
      identity, sourceUrl, engine, readPracticePlaybackRate(core.edition.song.songId),
    ) : null,
    [engine, identity, sourceUrl, core.edition.song.songId],
  )
  const context = useMemo(() => ({ session, views: new Map<string, unknown>() }), [session])
  useEffect(() => {
    session?.activate()
    return () => session?.close()
  }, [session])
  const timingRef = useRef(core.timingProvider)
  useEffect(() => {
    if (timingRef.current !== core.timingProvider) {
      session?.invalidateTiming()
      timingRef.current = core.timingProvider
    }
  }, [core.timingProvider, session])
  const scrollByMode = useRef(new Map<SongEditionTab, number>())
  const saveResume = (mode: ResumeMode, target: Partial<Pick<ResumeContext, 'occurrenceId' | 'practiceUnitId' | 'featureId'>> = {}): void => {
    saveResumeContext({
      schemaVersion: 1,
      songId: core.edition.song.songId,
      editionContentHash: core.edition.contentHash,
      audioSourceHash: core.edition.audio.sourceHash,
      timelineUrl: core.edition.timelineUrl,
      mode,
      updatedAt: Date.now(),
      ...target,
    })
  }
  const changeTab = (next: SongEditionTab): void => {
    if (tab === next) return
    scrollByMode.current.set(tab, window.scrollY)
    const previous = readResumeContext()
    const identity = {
      songId: core.edition.song.songId,
      editionContentHash: core.edition.contentHash,
      audioSourceHash: core.edition.audio.sourceHash,
      timelineUrl: core.edition.timelineUrl,
    }
    saveResume(next, previous && isResumeIdentityCompatible(previous, identity)
      ? { occurrenceId: previous.occurrenceId, practiceUnitId: previous.practiceUnitId, featureId: previous.featureId }
      : {})
    if (tab === 'explain') session?.cancelPreview()
    setTab(next)
  }
  const addToPracticeQueue = (assembledOccurrence: import('../runtime/song-edition').AssembledOccurrence): 'added' | 'duplicate' | 'full' | 'unavailable' => {
    const practiceUnitId = createPracticeIndex(core.practice, core.timeline)
      .unitIdByOccurrenceId.get(assembledOccurrence.occurrence.id)
    if (!practiceUnitId) return 'unavailable'
    return addPracticeQueueItem({
      songId: core.edition.song.songId,
      editionContentHash: core.edition.contentHash,
      audioSourceHash: core.edition.audio.sourceHash,
      timelineUrl: core.edition.timelineUrl,
      practiceUnitId,
      occurrenceId: assembledOccurrence.occurrence.id,
      segmentId: assembledOccurrence.segment.id,
    })
  }
  const showRelatedExplain = (mode: Exclude<SongEditionTab, 'explain'>, occurrenceId: string, segmentId: string): void => {
    setExplainSourceMode(mode)
    setRelatedExplainIntent({ occurrenceId, segmentId })
    changeTab('explain')
  }
  const returnToExplainSource = (): void => {
    if (!explainSourceMode) return
    setRelatedExplainIntent(undefined)
    const sourceMode = explainSourceMode
    setExplainSourceMode(undefined)
    changeTab(sourceMode)
  }
  useLayoutEffect(() => {
    if (scrollByMode.current.size === 0) return
    const top = scrollByMode.current.get(tab) ?? 0
    if (Math.abs(window.scrollY - top) > 0.5) window.scrollTo({ top, behavior: 'auto' })
  }, [tab])
  const song = core.edition.song
  return (
    <SongPlaybackContext.Provider value={context}>
      <LyricDisplayPreferencesProvider>
        <main
          className="song-edition is-practice-page"
          aria-labelledby="song-title"
          data-mode={tab}
        >
          <header className="practice-page-header">
            <div className="practice-page-identity">
              <a className="text-link" href={homeHref}>
                返回曲库
              </a>
              <div className="practice-page-song">
                <p className="eyebrow">学唱</p>
                <h1 id="song-title">{song.title}</h1>
                <p className="practice-page-artist">{song.artist}</p>
                {song.album || song.year !== undefined ? (
                  <p className="practice-page-meta">
                    {song.album ?? ''}
                    {song.album && song.year !== undefined ? ' / ' : ''}
                    {song.year ?? ''}
                  </p>
                ) : null}
              </div>
              <button
                ref={coverTriggerRef}
                className="practice-page-cover-trigger"
                type="button"
                aria-label={`查看${song.title}封面大图`}
                aria-haspopup="dialog"
                aria-expanded={coverViewerOpen}
                onClick={() => setCoverViewerOpen(true)}
              >
                <img
                  className="practice-page-cover"
                  src={runtimeClient.resolveAsset(core.edition.artwork.coverSmallUrl)}
                  alt=""
                />
              </button>
            </div>
          </header>
          <div className="practice-page-tools">
            <nav className="edition-task-nav" aria-label="歌曲任务">
              <button
                type="button"
                className={tab === 'practice' ? 'is-active' : ''}
                aria-current={tab === 'practice' ? 'page' : undefined}
                onClick={() => {
                  setPracticeNavigationRequest(undefined)
                  setRelatedExplainIntent(undefined)
                  setExplainSourceMode(undefined)
                  changeTab('practice')
                }}
              >
                学唱
              </button>
              <button
                type="button"
                className={tab === 'all' ? 'is-active' : ''}
                aria-current={tab === 'all' ? 'page' : undefined}
                onClick={() => { setRelatedExplainIntent(undefined); setExplainSourceMode(undefined); changeTab('all') }}
              >
                全曲
              </button>
              <button
                type="button"
                className={tab === 'explain' ? 'is-active' : ''}
                aria-current={tab === 'explain' ? 'page' : undefined}
                onClick={() => changeTab('explain')}
              >
                讲解
              </button>
            </nav>
          </div>

          {entryMessage ? <p className="song-entry-message" role="status">{entryMessage}</p> : null}

          {tab === 'practice' ? (
            <PracticeWorkspace
              key={core.edition.contentHash}
              model={core.assembled}
              runtimeClient={runtimeClient}
              audioEngine={audioEngine}
              requestedPracticeIntent={practiceNavigationRequest}
              initialPracticeTarget={initialPracticeTarget}
              onRequestedPracticeIntentConsumed={() => setPracticeNavigationRequest(undefined)}
              onResumePosition={({ practiceUnitId, occurrenceId }) => saveResume('practice', { practiceUnitId, occurrenceId })}
              onShowRelatedExplain={(occurrenceId, segmentId) => showRelatedExplain('practice', occurrenceId, segmentId)}
              onAddToQueue={addToPracticeQueue}
              activeQueueItemId={activeQueueItemId}
              nextQueueHref={nextQueueItem
                ? createPracticeQueueHref(nextQueueItem.songId, nextQueueItem.id, window.location)
                : undefined}
            />
          ) : tab === 'all' ? (
            <FullSongWorkspace
              model={core.assembled}
              runtimeClient={runtimeClient}
              audioEngine={audioEngine}
              initialOccurrenceId={initialFullSongOccurrenceId}
              onStartPracticeUnit={(practiceUnitId, occurrenceId) => {
                setPracticeNavigationRequest({ practiceUnitId, occurrenceId })
                changeTab('practice')
              }}
              onShowRelatedExplain={(occurrenceId, segmentId) => showRelatedExplain('all', occurrenceId, segmentId)}
              onAddToQueue={addToPracticeQueue}
              onResumeOccurrence={(occurrenceId) => saveResume('all', { occurrenceId })}
            />
          ) : (
            <ExplainWorkspace
              model={core.assembled}
              runtimeClient={runtimeClient}
              audioEngine={audioEngine}
              initialFeatureId={initialExplainFeatureId}
              relatedContext={relatedExplainIntent}
              onReturnToSource={explainSourceMode ? returnToExplainSource : undefined}
              onResumeFeature={(featureId) => saveResume('explain', { featureId })}
            />
          )}
          {coverViewerOpen ? (
            <div
              className="cover-viewer-backdrop"
              onClick={() => setCoverViewerOpen(false)}
            >
              <div
                ref={coverViewerRef}
                className="cover-viewer"
                role="dialog"
                aria-modal="true"
                aria-label={`${song.title}封面预览`}
                tabIndex={-1}
              >
                <img
                  className="cover-viewer-image"
                  src={runtimeClient.resolveAsset(core.edition.artwork.coverLargeUrl)}
                  alt={`${song.title}封面大图`}
                  onClick={(event) => event.stopPropagation()}
                />
              </div>
            </div>
          ) : null}
        </main>
      </LyricDisplayPreferencesProvider>
    </SongPlaybackContext.Provider>
  )
}

function SongEditionStatus({
  homeHref,
}: {
  homeHref: string
}) {
  return (
    <main className="song-edition song-edition-status" aria-labelledby="song-title">
      <p className="eyebrow">歌曲 / 打开中</p>
      <h1 id="song-title">正在打开歌曲…</h1>
      <p className="song-status-copy">正在读取歌曲内容。</p>
      <a className="text-link" href={homeHref}>
        返回曲库
      </a>
    </main>
  )
}

function describeEditionError(error: unknown): string {
  if (error instanceof RuntimeClientError) {
    if (error.kind === 'offline-not-downloaded') {
      return '这首歌的当前版本尚未下载，离线时无法打开。'
    }
    if (error.kind === 'download-incomplete') {
      return '这首歌的本地下载不完整，请联网后重新下载。'
    }
    if (error.kind === 'json-parse' || error.kind === 'schema') {
      return '歌曲 Runtime 数据格式无效，请联网重试或重新下载。'
    }
    return `Runtime ${error.kind} while reading ${error.logicalPath}.`
  }
  return 'The edition resources returned an unexpected error.'
}

function playbackIdentity(edition: RuntimeSongEditionCore['edition']): string {
  return [edition.song.songId, edition.contentHash, edition.audio.sourceHash,
    edition.audio.runtimeHash, edition.timelineUrl].join(':')
}

function resolveEntryContext(
  core: RuntimeSongEditionCore,
  continueLastRequested?: boolean,
  practiceQueueItemId?: string,
): {
  tab: SongEditionTab
  practiceTarget?: ResumePracticeTarget
  activeQueueItemId?: string
  nextQueueItem?: PracticeQueueItem
  fullSongOccurrenceId?: string
  explainFeatureId?: string
  message?: string
} {
  const practiceIndex = createPracticeIndex(core.practice, core.timeline)
  if (practiceQueueItemId) {
    const queue = readPracticeQueueStatus()
    const item = queue.queue.items.find(({ id }) => id === practiceQueueItemId)
    if (queue.invalid || !item) {
      return { tab: 'practice', message: '待练项目无法验证，已安全打开普通学唱。' }
    }
    const matches = item.songId === core.edition.song.songId &&
      item.editionContentHash === core.edition.contentHash &&
      item.audioSourceHash === core.edition.audio.sourceHash &&
      item.timelineUrl === core.edition.timelineUrl &&
      item.practiceUnitId === practiceIndex.unitIdByOccurrenceId.get(item.occurrenceId) &&
      core.assembled.segmentsById[item.segmentId] !== undefined &&
      core.timeline.occurrences.some(({ id, segmentId }) =>
        id === item.occurrenceId && segmentId === item.segmentId,
      )
    return matches
      ? {
          tab: 'practice',
          practiceTarget: { practiceUnitId: item.practiceUnitId, occurrenceId: item.occurrenceId },
          activeQueueItemId: item.id,
          nextQueueItem: queue.queue.items[queue.queue.items.indexOf(item) + 1],
        }
      : { tab: 'practice', message: '待练项目对应的版本或歌词已变化，已安全打开普通学唱；队列项目仍保留。' }
  }

  if (!continueLastRequested) return { tab: 'practice' }
  const saved = readResumeContext()
  const currentIdentity = {
    songId: core.edition.song.songId,
    editionContentHash: core.edition.contentHash,
    audioSourceHash: core.edition.audio.sourceHash,
    timelineUrl: core.edition.timelineUrl,
  }
  if (!saved || saved.songId !== currentIdentity.songId) {
    if (!saved) {
      const legacy = readPracticeResumeMetadata(currentIdentity.songId)
      const practiceUnitId = legacy
        ? practiceIndex.unitIdByOccurrenceId.get(legacy.occurrenceId)
        : undefined
      if (legacy && practiceUnitId) {
        return {
          tab: 'practice',
          practiceTarget: { practiceUnitId, occurrenceId: legacy.occurrenceId },
        }
      }
    }
    return { tab: 'practice', message: '没有可恢复的最近学习位置，已从学唱打开。' }
  }
  if (
    saved.editionContentHash !== currentIdentity.editionContentHash ||
    saved.audioSourceHash !== currentIdentity.audioSourceHash ||
    saved.timelineUrl !== currentIdentity.timelineUrl
  ) {
    return { tab: 'practice', message: '最近位置与当前完整 Song Edition 不兼容，已安全回到学唱。' }
  }
  if (saved.mode === 'practice') {
    const unitId = saved.occurrenceId
      ? practiceIndex.unitIdByOccurrenceId.get(saved.occurrenceId)
      : undefined
    if (unitId && (!saved.practiceUnitId || saved.practiceUnitId === unitId)) {
      return { tab: 'practice', practiceTarget: { practiceUnitId: unitId, occurrenceId: saved.occurrenceId! } }
    }
    return { tab: 'practice', message: '最近的学唱句子已不在当前版本中，已安全回到默认学唱位置。' }
  }
  if (saved.mode === 'all') {
    return saved.occurrenceId && core.assembled.occurrencesById[saved.occurrenceId]
      ? { tab: 'all', fullSongOccurrenceId: saved.occurrenceId }
      : { tab: 'practice', message: '最近的全曲位置已不在当前版本中，已安全回到学唱。' }
  }
  return saved.featureId && core.edition.features.some(({ id }) => id === saved.featureId)
    ? { tab: 'explain', explainFeatureId: saved.featureId }
    : { tab: 'practice', message: '最近的讲解主题已不在当前版本中，已安全回到学唱。' }
}
