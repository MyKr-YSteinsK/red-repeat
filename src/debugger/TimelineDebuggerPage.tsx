import { useEffect, useState, type ReactNode } from 'react'
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
    />
  )
}

function TimelineDebuggerReady({
  resources,
  homeHref,
}: {
  resources: TimelineDebuggerResources
  homeHref: string
}) {
  const [workingTimeline] = useState<TimelineDocument>(() =>
    cloneTimeline(resources.timeline),
  )

  return (
    <main className="timeline-debugger" data-debugger-state="ready">
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
          <span className="timeline-debugger-badge">WORKING COPY / CLEAN</span>
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
        </dl>
      </section>

      <section className="timeline-debugger-placeholder" role="status">
        <p className="timeline-debugger-eyebrow">PHASE 4 / RUNTIME BOUNDARY</p>
        <h2>Runtime resources are loaded.</h2>
        <p>
          The in-memory Timeline working copy is ready for live context and
          timing controls.
        </p>
      </section>
    </main>
  )
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
