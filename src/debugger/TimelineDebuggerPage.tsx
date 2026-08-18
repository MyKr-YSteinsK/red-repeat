import { useEffect, useState, type ReactNode } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import type { Catalog, CatalogEdition } from '../library/runtime-schema'
import type {
  LyricsDocument,
  TimelineDocument,
  VisualDocument,
} from '../library/schema'
import {
  RuntimeClient,
  RuntimeClientError,
} from '../runtime/runtime-client'
import { cloneTimeline } from './timeline-debugger-model'
import { useTimelineDebuggerPlayback } from './use-timeline-debugger-playback'

export type TimelineDebuggerCatalogState =
  | { status: 'loading' }
  | { status: 'ready'; catalog: Catalog }
  | { status: 'error'; error: unknown }

export interface TimelineDebuggerPageProps {
  songId?: string
  catalogState: TimelineDebuggerCatalogState
  runtimeClient: RuntimeClient
  homeHref: string
  onRetryCatalog: () => void
  audioEngine?: AudioEngine
}

type DebuggerResourceState =
  | { status: 'idle' }
  | { status: 'loading'; catalogEdition: CatalogEdition }
  | { status: 'ready'; resources: TimelineDebuggerResources }
  | { status: 'error'; error: unknown; catalogEdition: CatalogEdition }

export interface TimelineDebuggerResources {
  catalogEdition: CatalogEdition
  edition: Awaited<ReturnType<RuntimeClient['loadEdition']>>
  lyrics: LyricsDocument
  timeline: TimelineDocument
  visual: VisualDocument
}

export function TimelineDebuggerPage({
  songId,
  catalogState,
  runtimeClient,
  homeHref,
  onRetryCatalog,
  audioEngine,
}: TimelineDebuggerPageProps) {
  const catalogEdition =
    catalogState.status === 'ready' && songId
      ? catalogState.catalog.editions.find(
          (edition) => edition.songId === songId,
        )
      : undefined
  const [resourceState, setResourceState] = useState<DebuggerResourceState>({
    status: 'idle',
  })

  useEffect(() => {
    if (!catalogEdition) {
      return
    }

    let active = true
    const controller = new AbortController()
    void loadDebuggerResources(runtimeClient, catalogEdition, controller.signal)
      .then((resources) => {
        if (active) {
          setResourceState({ status: 'ready', resources })
        }
      })
      .catch((error: unknown) => {
        if (active && !(error instanceof RuntimeClientError && error.kind === 'abort')) {
          setResourceState({ status: 'error', error, catalogEdition })
        }
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [catalogEdition, runtimeClient])

  if (catalogState.status === 'loading') {
    return (
      <DebuggerStatusPage
        title="Loading runtime catalog."
        detail="Reading the compiled edition index for the debugger."
        homeHref={homeHref}
        state="loading"
      />
    )
  }

  if (catalogState.status === 'error') {
    return (
      <DebuggerStatusPage
        title="The debugger catalog is unavailable."
        detail={describeDebuggerError(catalogState.error)}
        homeHref={homeHref}
        state="error"
        action={
          <button type="button" onClick={onRetryCatalog}>
            Retry catalog
          </button>
        }
      />
    )
  }

  if (catalogState.catalog.editions.length === 0) {
    return (
      <DebuggerStatusPage
        title="The runtime catalog is empty."
        detail="Compile at least one Song Edition before opening Timeline Debugger."
        homeHref={homeHref}
        state="empty"
      />
    )
  }

  if (!songId) {
    return (
      <DebuggerStatusPage
        title="Choose a Song Edition for Timeline Debugger."
        detail="Open this dev tool with #debug=timeline&edition=<song-id>."
        homeHref={homeHref}
        state="missing-edition"
      />
    )
  }

  if (!catalogEdition) {
    return (
      <DebuggerStatusPage
        title="The requested edition is not in the runtime catalog."
        detail={`No compiled Song Edition matches "${songId}".`}
        homeHref={homeHref}
        state="missing-edition"
      />
    )
  }

  if (resourceState.status === 'idle' || resourceState.status === 'loading') {
    return (
      <DebuggerStatusPage
        title={`Loading ${catalogEdition.title} timeline.`}
        detail="Reading Runtime Edition, Lyrics, Timeline, and Visual resources."
        homeHref={homeHref}
        state="loading"
      />
    )
  }

  if (resourceState.status === 'error') {
    if (resourceState.catalogEdition.songId !== catalogEdition.songId) {
      return (
        <DebuggerStatusPage
          title={`Loading ${catalogEdition.title} timeline.`}
          detail="Reading Runtime Edition, Lyrics, Timeline, and Visual resources."
          homeHref={homeHref}
          state="loading"
        />
      )
    }

    return (
      <DebuggerStatusPage
        title={`Could not load ${catalogEdition.title}.`}
        detail={describeDebuggerError(resourceState.error)}
        homeHref={homeHref}
        state="error"
      />
    )
  }

  if (resourceState.resources.catalogEdition.songId !== catalogEdition.songId) {
    return (
      <DebuggerStatusPage
        title={`Loading ${catalogEdition.title} timeline.`}
        detail="Reading Runtime Edition, Lyrics, Timeline, and Visual resources."
        homeHref={homeHref}
        state="loading"
      />
    )
  }

  return (
    <TimelineDebuggerReady
      key={`${resourceState.resources.catalogEdition.songId}:${resourceState.resources.edition.timelineUrl}`}
      resources={resourceState.resources}
      homeHref={homeHref}
      runtimeClient={runtimeClient}
      audioEngine={audioEngine}
    />
  )
}

function TimelineDebuggerReady({
  resources,
  homeHref,
  runtimeClient,
  audioEngine,
}: {
  resources: TimelineDebuggerResources
  homeHref: string
  runtimeClient: RuntimeClient
  audioEngine?: AudioEngine
}) {
  const [workingTimeline] = useState<TimelineDocument>(() =>
    cloneTimeline(resources.timeline),
  )
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<
    string | undefined
  >(() => workingTimeline.occurrences[0]?.id)
  const [selectedSectionId, setSelectedSectionId] = useState<string | undefined>(
    () => workingTimeline.sections[0]?.id,
  )
  const [transportMessage, setTransportMessage] = useState<string>()
  const playback = useTimelineDebuggerPlayback(
    workingTimeline,
    runtimeClient.resolveAsset(resources.edition.audio.url),
    audioEngine,
  )
  const chronologicalOccurrences = getChronologicalOccurrences(workingTimeline)
  const chronologicalIndex = new Map(
    chronologicalOccurrences.map(({ occurrence }, index) => [occurrence.id, index]),
  )
  const selectedOccurrence = workingTimeline.occurrences.find(
    (occurrence) => occurrence.id === selectedOccurrenceId,
  )
  const selectedSection = workingTimeline.sections.find(
    (section) => section.id === selectedSectionId,
  )
  const segmentById = new Map(
    resources.lyrics.segments.map((segment) => [segment.id, segment]),
  )
  const activeOccurrenceIds = new Set(
    playback.resolution.activeOccurrences.map((occurrence) => occurrence.id),
  )

  const runEngineAction = (action: () => void | Promise<void>): void => {
    try {
      void Promise.resolve(action()).catch(() => {
        setTransportMessage('Audio Engine could not complete that action.')
      })
    } catch {
      setTransportMessage('Audio Engine could not complete that action.')
    }
  }

  const selectOccurrence = (occurrenceId: string): void => {
    const occurrence = workingTimeline.occurrences.find(
      (candidate) => candidate.id === occurrenceId,
    )
    if (!occurrence) {
      return
    }
    setSelectedOccurrenceId(occurrence.id)
    setSelectedSectionId(occurrence.sectionId)
    setTransportMessage(undefined)
  }

  const selectRelativeOccurrence = (offset: -1 | 1): void => {
    const currentIndex = selectedOccurrenceId
      ? chronologicalOccurrences.findIndex(
          ({ occurrence }) => occurrence.id === selectedOccurrenceId,
        )
      : offset > 0
        ? -1
        : chronologicalOccurrences.length
    const target = chronologicalOccurrences[currentIndex + offset]
    if (target) {
      selectOccurrence(target.occurrence.id)
    }
  }

  const togglePlay = (): void => {
    if (!playback.engine) {
      setTransportMessage('Audio playback is unavailable in this environment.')
      return
    }
    setTransportMessage(undefined)
    if (playback.audioState.status === 'playing') {
      playback.engine.pause()
    } else {
      runEngineAction(() => playback.engine?.playContinuous())
    }
  }

  const seekTo = (timeMs: number | undefined): void => {
    if (timeMs === undefined) {
      return
    }
    if (!playback.engine) {
      setTransportMessage('Audio playback is unavailable in this environment.')
      return
    }
    setTransportMessage(undefined)
    runEngineAction(() => playback.engine?.seek(timeMs))
  }

  const replaySelectedOccurrence = (): void => {
    if (!selectedOccurrence) {
      return
    }
    if (!playback.engine) {
      setTransportMessage('Audio playback is unavailable in this environment.')
      return
    }
    setTransportMessage(undefined)
    runEngineAction(() =>
      playback.engine?.playRange(
        {
          startMs: selectedOccurrence.playStartMs,
          endMs: selectedOccurrence.playEndMs,
        },
        selectedOccurrence.id,
      ),
    )
  }

  return (
    <main
      className="timeline-debugger"
      data-debugger-state="ready"
      data-working-copy-state="clean"
      data-current-time-ms={playback.audioState.currentTimeMs}
    >
      <header className="timeline-debugger-header">
        <div>
          <p className="timeline-debugger-eyebrow">DEV TOOL / TIMELINE</p>
          <h1>Timeline Debugger</h1>
          <p className="timeline-debugger-lede">
            Inspect the compiled runtime timeline before manually confirming a
            source package update.
          </p>
        </div>
        <a className="timeline-debugger-link" href={homeHref}>
          Return to Library
        </a>
      </header>

      <section className="timeline-debugger-panel" aria-labelledby="debugger-song-title">
        <div className="timeline-debugger-panel-heading">
          <div>
            <p className="timeline-debugger-eyebrow">EDITION / {resources.catalogEdition.songId}</p>
            <h2 id="debugger-song-title">{resources.edition.song.title}</h2>
            <p>{resources.edition.song.artist}</p>
          </div>
          <span className="timeline-debugger-badge">
            WORKING COPY / CLEAN
          </span>
        </div>

        <dl className="timeline-debugger-facts">
          <div>
            <dt>Sections</dt>
            <dd>{workingTimeline.sections.length}</dd>
          </div>
          <div>
            <dt>Occurrences</dt>
            <dd>{workingTimeline.occurrences.length}</dd>
          </div>
          <div>
            <dt>Timeline audio hash</dt>
            <dd>{workingTimeline.audioSourceHash}</dd>
          </div>
          <div>
            <dt>Compiled audio hash</dt>
            <dd>{resources.edition.audio.sourceHash}</dd>
          </div>
          <div>
            <dt>Theme</dt>
            <dd>{resources.visual.recommendedTheme}</dd>
          </div>
        </dl>
      </section>

      <section
        className="timeline-debugger-panel timeline-debugger-live"
        aria-labelledby="debugger-live-title"
        data-current-time-ms={playback.audioState.currentTimeMs}
      >
        <div className="timeline-debugger-section-heading">
          <div>
            <p className="timeline-debugger-eyebrow">LIVE CONTEXT</p>
            <h2 id="debugger-live-title">What is happening now.</h2>
          </div>
          <div className="timeline-debugger-clock" aria-live="polite">
            <strong>{formatDebuggerTime(playback.audioState.currentTimeMs)}</strong>
            <span>{playback.audioState.currentTimeMs} ms</span>
          </div>
        </div>

        <dl className="timeline-debugger-live-facts">
          <div>
            <dt>Playback</dt>
            <dd>{playback.audioState.status}</dd>
          </div>
          <div>
            <dt>Current Section</dt>
            <dd>{playback.resolution.currentSection?.label ?? 'Gap'}</dd>
          </div>
          <div>
            <dt>Primary Occurrence</dt>
            <dd>{playback.resolution.primaryOccurrence?.id ?? 'None'}</dd>
          </div>
          <div>
            <dt>Selected Occurrence</dt>
            <dd>{selectedOccurrence?.id ?? 'None'}</dd>
          </div>
          <div>
            <dt>Selected Section</dt>
            <dd>{selectedSection?.id ?? 'None'}</dd>
          </div>
          <div>
            <dt>Dirty State</dt>
            <dd>clean</dd>
          </div>
        </dl>

        <div className="timeline-debugger-active" aria-labelledby="active-occurrences-title">
          <h3 id="active-occurrences-title">Active Occurrences</h3>
          {playback.resolution.activeOccurrences.length > 0 ? (
            <ul>
              {playback.resolution.activeOccurrences.map((occurrence) => {
                const segment = segmentById.get(occurrence.segmentId)
                return (
                  <li key={occurrence.id}>
                    <button
                      type="button"
                      className={activeOccurrenceIds.has(occurrence.id) ? 'is-active' : ''}
                      aria-pressed={selectedOccurrenceId === occurrence.id}
                      onClick={() => selectOccurrence(occurrence.id)}
                    >
                      <span>{occurrence.id}</span>
                      <strong>{segment?.lyrics ?? occurrence.segmentId}</strong>
                      {playback.resolution.primaryOccurrence?.id === occurrence.id ? (
                        <em>PRIMARY</em>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p>No active Occurrence.</p>
          )}
        </div>

        <div className="timeline-debugger-transport" aria-label="Debugger transport">
          <button type="button" onClick={togglePlay} disabled={!playback.engine}>
            {playback.audioState.status === 'playing' ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={() => seekTo(selectedOccurrence?.playStartMs)}
            disabled={!selectedOccurrence || !playback.engine}
          >
            Seek playStartMs
          </button>
          <button
            type="button"
            onClick={() => seekTo(selectedOccurrence?.startMs)}
            disabled={!selectedOccurrence || !playback.engine}
          >
            Seek startMs
          </button>
          <button
            type="button"
            onClick={replaySelectedOccurrence}
            disabled={!selectedOccurrence || !playback.engine}
          >
            Replay practice range
          </button>
          <button
            type="button"
            onClick={() => selectRelativeOccurrence(-1)}
            disabled={!selectedOccurrence || chronologicalIndex.get(selectedOccurrence.id) === 0}
          >
            Previous Occurrence
          </button>
          <button
            type="button"
            onClick={() => selectRelativeOccurrence(1)}
            disabled={
              !selectedOccurrence ||
              chronologicalIndex.get(selectedOccurrence.id) ===
                chronologicalOccurrences.length - 1
            }
          >
            Next Occurrence
          </button>
        </div>
        {transportMessage ? (
          <p className="timeline-debugger-message" role="status">
            {transportMessage}
          </p>
        ) : null}
      </section>

      <section className="timeline-debugger-panel" aria-labelledby="selected-occurrence-title">
        <div className="timeline-debugger-section-heading">
          <div>
            <p className="timeline-debugger-eyebrow">SELECTED OCCURRENCE</p>
            <h2 id="selected-occurrence-title">
              {selectedOccurrence?.id ?? 'None selected'}
            </h2>
          </div>
          {selectedOccurrence ? (
            <span className="timeline-debugger-badge">
              CHRONOLOGICAL / {(chronologicalIndex.get(selectedOccurrence.id) ?? 0) + 1}
            </span>
          ) : null}
        </div>
        {selectedOccurrence ? (
          <dl className="timeline-debugger-timing-facts">
            <div>
              <dt>sectionId</dt>
              <dd>{selectedOccurrence.sectionId}</dd>
            </div>
            <div>
              <dt>segmentId</dt>
              <dd>{selectedOccurrence.segmentId}</dd>
            </div>
            <div>
              <dt>playStartMs</dt>
              <dd>{selectedOccurrence.playStartMs}</dd>
            </div>
            <div>
              <dt>startMs</dt>
              <dd>{selectedOccurrence.startMs}</dd>
            </div>
            <div>
              <dt>endMs</dt>
              <dd>{selectedOccurrence.endMs}</dd>
            </div>
            <div>
              <dt>playEndMs</dt>
              <dd>{selectedOccurrence.playEndMs}</dd>
            </div>
            <div className="timeline-debugger-timing-wide">
              <dt>Original lyric</dt>
              <dd>{segmentById.get(selectedOccurrence.segmentId)?.lyrics ?? 'Missing Segment'}</dd>
            </div>
            <div className="timeline-debugger-timing-wide">
              <dt>translation</dt>
              <dd>{segmentById.get(selectedOccurrence.segmentId)?.translation ?? 'Missing Segment'}</dd>
            </div>
          </dl>
        ) : (
          <p>No Occurrence is available in this Timeline.</p>
        )}
      </section>

      <section className="timeline-debugger-panel" aria-labelledby="timeline-list-title">
        <div className="timeline-debugger-section-heading">
          <div>
            <p className="timeline-debugger-eyebrow">SOURCE ORDER / CHRONOLOGY</p>
            <h2 id="timeline-list-title">Timeline</h2>
          </div>
          <span className="timeline-debugger-badge">
            {workingTimeline.sections.length} SECTION(S)
          </span>
        </div>
        <ol className="timeline-debugger-list">
          {workingTimeline.sections.map((section, sectionIndex) => {
            const occurrences = workingTimeline.occurrences.filter(
              (occurrence) => occurrence.sectionId === section.id,
            )
            return (
              <li key={section.id}>
                <button
                  type="button"
                  className={`timeline-debugger-section-row${
                    selectedSectionId === section.id ? ' is-selected' : ''
                  }`}
                  aria-label={`Select Section ${section.label}`}
                  aria-pressed={selectedSectionId === section.id}
                  onClick={() => setSelectedSectionId(section.id)}
                >
                  <span>{String(sectionIndex + 1).padStart(2, '0')}</span>
                  <strong>{section.label}</strong>
                  <span>
                    {section.startMs}–{section.endMs} ms
                  </span>
                  <span>{occurrences.length} occurrence(s)</span>
                </button>
                {occurrences.length > 0 ? (
                  <ol className="timeline-debugger-occurrence-list">
                    {occurrences.map((occurrence, sourceIndex) => {
                      const segment = segmentById.get(occurrence.segmentId)
                      const chronologicalPosition = chronologicalIndex.get(occurrence.id)
                      return (
                        <li key={occurrence.id}>
                          <button
                            type="button"
                            className={`timeline-debugger-occurrence-row${
                              selectedOccurrenceId === occurrence.id ? ' is-selected' : ''
                            }`}
                            aria-pressed={selectedOccurrenceId === occurrence.id}
                            onClick={() => selectOccurrence(occurrence.id)}
                          >
                            <span>
                              {occurrence.id} / source {sourceIndex + 1}
                            </span>
                            <strong>{segment?.lyrics ?? occurrence.segmentId}</strong>
                            <span>
                              actual {occurrence.startMs}–{occurrence.endMs} ms · play{' '}
                              {occurrence.playStartMs}–{occurrence.playEndMs} ms
                            </span>
                            <span>
                              chronological {chronologicalPosition === undefined ? '—' : chronologicalPosition + 1}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                ) : (
                  <p className="timeline-debugger-instrumental">
                    Instrumental Section / no lyric Occurrences
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      </section>
    </main>
  )
}

function getChronologicalOccurrences(timeline: TimelineDocument) {
  return timeline.occurrences
    .map((occurrence, sourceIndex) => ({ occurrence, sourceIndex }))
    .sort(
      (left, right) =>
        left.occurrence.startMs - right.occurrence.startMs ||
        left.sourceIndex - right.sourceIndex,
    )
}

function formatDebuggerTime(timeMs: number): string {
  const safeTimeMs = Math.max(0, Math.round(timeMs))
  const minutes = Math.floor(safeTimeMs / 60_000)
  const seconds = Math.floor((safeTimeMs % 60_000) / 1_000)
  const milliseconds = safeTimeMs % 1_000
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
    2,
    '0',
  )}.${String(milliseconds).padStart(3, '0')}`
}

function DebuggerStatusPage({
  title,
  detail,
  homeHref,
  state,
  action,
}: {
  title: string
  detail: string
  homeHref: string
  state: string
  action?: ReactNode
}) {
  return (
    <main
      className="timeline-debugger timeline-debugger-status"
      data-debugger-state={state}
      aria-labelledby="timeline-debugger-title"
      role={state === 'error' ? 'alert' : undefined}
    >
      <p className="timeline-debugger-eyebrow">DEV TOOL / TIMELINE</p>
      <h1 id="timeline-debugger-title">{title}</h1>
      <p className="timeline-debugger-lede">{detail}</p>
      {action ? <div className="timeline-debugger-actions">{action}</div> : null}
      <a className="timeline-debugger-link" href={homeHref}>
        Return to Library
      </a>
    </main>
  )
}

async function loadDebuggerResources(
  runtimeClient: RuntimeClient,
  catalogEdition: CatalogEdition,
  signal: AbortSignal,
): Promise<TimelineDebuggerResources> {
  const edition = await runtimeClient.loadEdition(catalogEdition.editionUrl, {
    signal,
  })
  const [lyrics, timeline, visual] = await Promise.all([
    runtimeClient.loadLyrics(edition.lyricsUrl, { signal }),
    runtimeClient.loadTimeline(edition.timelineUrl, { signal }),
    runtimeClient.loadVisual(edition.visualUrl, { signal }),
  ])
  return { catalogEdition, edition, lyrics, timeline, visual }
}

function describeDebuggerError(error: unknown): string {
  if (error instanceof RuntimeClientError) {
    return `Runtime ${error.kind} while reading ${error.logicalPath}.`
  }
  return 'The debugger runtime returned an unexpected error.'
}
