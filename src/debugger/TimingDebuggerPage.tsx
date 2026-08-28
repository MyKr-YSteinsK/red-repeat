import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import type { Catalog, CatalogEdition } from '../library/runtime-schema'
import {
  createTimingDebuggerHref,
} from '../navigation'
import {
  createEffectiveOccurrenceTimingProvider,
  createTimingOverridesDocument,
  readTimingOverrides,
  saveTimingOverrides,
  updateTimingOverride,
  type TimingOverrideIdentity,
  type TimingOverridesDocument,
} from '../practice/practice-timing-overrides'
import type { RuntimeClient } from '../runtime/runtime-client'
import type { RuntimeSongEditionCore } from '../runtime/song-edition-loader'
import { useSongEditionPlayback } from '../edition/use-song-edition-playback'
import { useSongEditionCore } from '../edition/use-song-edition-core'
import { LyricText } from '../edition/LyricText'

export type TimingDebuggerCatalogState =
  | { status: 'loading' }
  | { status: 'ready'; catalog: Catalog }
  | { status: 'error'; error: unknown }

export interface TimingDebuggerPageProps {
  songId?: string
  catalogState: TimingDebuggerCatalogState
  runtimeClient: RuntimeClient
  homeHref: string
  onRetryCatalog: () => void
  audioEngine?: AudioEngine
}

export function TimingDebuggerPage({
  songId,
  catalogState,
  runtimeClient,
  homeHref,
  onRetryCatalog,
  audioEngine,
}: TimingDebuggerPageProps) {
  if (catalogState.status === 'loading') {
    return <TimingDebuggerStatus title="正在读取曲库…" detail="准备播放切口调试。" homeHref={homeHref} />
  }

  if (catalogState.status === 'error') {
    return (
      <TimingDebuggerStatus
        title="曲库暂时无法打开"
        detail="无法选择歌曲进行播放切口调试。"
        homeHref={homeHref}
      >
        <button type="button" onClick={onRetryCatalog}>重试</button>
      </TimingDebuggerStatus>
    )
  }

  if (catalogState.catalog.editions.length === 0) {
    return (
      <TimingDebuggerStatus
        title="曲库里还没有歌曲"
        detail="添加一首 Song Edition 后，再从这里调整播放切口。"
        homeHref={homeHref}
      />
    )
  }

  const catalogEdition = songId
    ? catalogState.catalog.editions.find((edition) => edition.songId === songId)
    : undefined
  if (!catalogEdition) {
    return (
      <TimingDebuggerSelector
        editions={catalogState.catalog.editions}
        homeHref={homeHref}
        runtimeLocation={window.location}
      />
    )
  }

  return (
    <TimingDebuggerEdition
      key={`${catalogEdition.songId}:${catalogEdition.editionUrl}`}
      catalogEdition={catalogEdition}
      runtimeClient={runtimeClient}
      homeHref={homeHref}
      audioEngine={audioEngine}
    />
  )
}

function TimingDebuggerEdition({
  catalogEdition,
  runtimeClient,
  homeHref,
  audioEngine,
}: {
  catalogEdition: CatalogEdition
  runtimeClient: RuntimeClient
  homeHref: string
  audioEngine?: AudioEngine
}) {
  const [retryKey, setRetryKey] = useState(0)
  const loaded = useSongEditionCore(runtimeClient, catalogEdition, retryKey)

  if (loaded.status === 'loading') {
    return <TimingDebuggerStatus title={`正在读取 ${catalogEdition.title}`} detail="正在加载歌词、Timeline 和音频。" homeHref={homeHref} />
  }

  if (loaded.status === 'error') {
    return (
      <TimingDebuggerStatus
        title={`${catalogEdition.title} 暂时无法打开`}
        detail="无法读取这首歌的 Runtime 内容。"
        homeHref={homeHref}
      >
        <button type="button" onClick={() => setRetryKey((value) => value + 1)}>
          重试
        </button>
      </TimingDebuggerStatus>
    )
  }

  return (
    <TimingDebuggerReady
      core={loaded.core}
      runtimeClient={runtimeClient}
      homeHref={homeHref}
      audioEngine={audioEngine}
    />
  )
}

function TimingDebuggerReady({
  core,
  runtimeClient,
  homeHref,
  audioEngine,
}: {
  core: RuntimeSongEditionCore
  runtimeClient: RuntimeClient
  homeHref: string
  audioEngine?: AudioEngine
}) {
  const model = core.assembled
  const debuggerRef = useRef<HTMLElement | null>(null)
  const dockRef = useRef<HTMLElement | null>(null)
  const identity = useMemo<TimingOverrideIdentity>(
    () => ({
      songId: core.edition.song.songId,
      editionContentHash: core.edition.contentHash,
      audioSourceHash: core.edition.audio.sourceHash,
      baseTimelineUrl: core.edition.timelineUrl,
    }),
    [core.edition],
  )
  const initialDocument = useMemo(
    () => {
      const stored = readTimingOverrides(identity, {
        occurrences: model.timeline.occurrences,
      })
      return stored.kind === 'compatible'
        ? stored.document
        : createTimingOverridesDocument(identity)
    }, [identity, model.timeline.occurrences])
  const [document, setDocument] = useState<TimingOverridesDocument>(initialDocument)
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState(
    model.timeline.occurrences[0]?.id,
  )
  const [message, setMessage] = useState<string>()
  const timingProvider = useMemo(
    () => createEffectiveOccurrenceTimingProvider(model.timeline, document),
    [document, model.timeline],
  )
  const playback = useSongEditionPlayback(
    model,
    runtimeClient,
    audioEngine,
    timingProvider,
  )
  const chronologicalOccurrences = useMemo(
    () => [...model.timeline.occurrences].sort((left, right) => left.startMs - right.startMs),
    [model.timeline.occurrences],
  )
  const selectedOccurrence = selectedOccurrenceId
    ? model.occurrencesById[selectedOccurrenceId]?.occurrence
    : undefined
  const selectedIndex = selectedOccurrence
    ? chronologicalOccurrences.findIndex(({ id }) => id === selectedOccurrence.id)
    : -1

  const selectOccurrence = (occurrenceId: string): void => {
    setSelectedOccurrenceId(occurrenceId)
    setMessage(undefined)
  }

  const updateSelectedTiming = (
    field: 'startMs' | 'endMs',
    deltaMs: number,
  ): void => {
    if (!selectedOccurrence) {
      return
    }
    try {
      setDocument((current) =>
        updateTimingOverride(
          current,
          selectedOccurrence,
          field,
          timingProvider.getTiming(selectedOccurrence)[field] + deltaMs,
        ),
      )
      setMessage(undefined)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '播放切口无效。')
    }
  }

  const previewSelectedOccurrence = (): void => {
    if (!selectedOccurrence || !playback.engine) {
      setMessage('当前环境无法播放音频。')
      return
    }
    setMessage(undefined)
    const timing = timingProvider.getTiming(selectedOccurrence)
    void playback.engine
      .playRangeUntilComplete(
        { startMs: timing.startMs, endMs: timing.endMs },
        selectedOccurrence.id,
      )
      .then((completion) => {
        if (completion.status === 'errored') {
          setMessage(completion.error.message)
        }
      })
  }

  const save = (): void => {
    if (
      saveTimingOverrides(document, {
        occurrences: model.timeline.occurrences,
      })
    ) {
      setMessage('播放切口已保存到本机。')
    } else {
      setMessage('无法保存本机播放切口。')
    }
  }

  const selectRelative = (offset: -1 | 1): void => {
    const target = chronologicalOccurrences[selectedIndex + offset]
    if (target) {
      selectOccurrence(target.id)
    }
  }

  useLayoutEffect(() => {
    const debuggerElement = debuggerRef.current
    const dock = dockRef.current
    if (!debuggerElement || !dock) {
      return
    }

    const updateDockOcclusion = (): void => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const dockRect = dock.getBoundingClientRect()
      const bottomOffset = Math.max(0, viewportHeight - dockRect.bottom)
      const occlusion = Math.max(0, dockRect.height + bottomOffset)
      debuggerElement.style.setProperty(
        '--timing-debugger-dock-occlusion',
        `${Math.ceil(occlusion)}px`,
      )
    }

    updateDockOcclusion()
    const resizeObserver =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(updateDockOcclusion)
        : undefined
    resizeObserver?.observe(dock)
    window.addEventListener('resize', updateDockOcclusion)
    window.visualViewport?.addEventListener('resize', updateDockOcclusion)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateDockOcclusion)
      window.visualViewport?.removeEventListener('resize', updateDockOcclusion)
    }
  }, [])

  return (
    <main
      ref={debuggerRef}
      className="timing-debugger"
      data-debugger-state="ready"
    >
      <header className="timing-debugger-header">
        <div>
          <p className="eyebrow">播放切口调试 / {core.edition.song.songId}</p>
          <h1>播放切口调试</h1>
          <p className="timing-debugger-lede">
            只调整每句歌词的播放起点和终点；保存后，学唱、全曲和讲解会共同消费这份本机微调。
          </p>
        </div>
        <a className="text-link" href={homeHref}>返回曲库</a>
      </header>

      <section className="timing-debugger-panel" aria-labelledby="timing-song-title">
        <div className="timing-debugger-song-heading">
          <div>
            <p className="eyebrow">{core.edition.song.artist}</p>
            <h2 id="timing-song-title">{core.edition.song.title}</h2>
          </div>
          <span className="timing-debugger-identity">Edition {core.edition.contentHash.slice(0, 12)}</span>
        </div>
        <div className="timing-debugger-transport" aria-label="播放切口播放控制">
          <button type="button" onClick={() => selectRelative(-1)} disabled={selectedIndex <= 0}>
            上一句
          </button>
          <button
            type="button"
            onClick={() => selectRelative(1)}
            disabled={selectedIndex < 0 || selectedIndex >= chronologicalOccurrences.length - 1}
          >
            下一句
          </button>
        </div>
      </section>

      <div className="timing-debugger-layout">
        <section className="timing-debugger-lyrics" aria-label="完整歌词流">
          {model.sections.map(({ section, occurrences }) => (
            <section key={section.id} className="timing-debugger-section">
              <h3>{section.label}</h3>
              {occurrences.length > 0 ? (
                <ol>
                  {occurrences.map((assembledOccurrence) => {
                    const occurrence = assembledOccurrence.occurrence
                    const isSelected = selectedOccurrenceId === occurrence.id
                    const isPrimary = playback.resolution.primaryOccurrence?.id === occurrence.id
                    return (
                      <li key={occurrence.id} className={isPrimary ? 'is-playing' : ''}>
                        <button
                          type="button"
                          className={isSelected ? 'is-selected' : ''}
                          aria-pressed={isSelected}
                          onClick={() => selectOccurrence(occurrence.id)}
                        >
                          <LyricText segment={assembledOccurrence.segment} />
                          <small>{isPrimary ? '当前播放' : occurrence.id}</small>
                        </button>
                      </li>
                    )
                  })}
                </ol>
              ) : (
                <p className="timing-debugger-gap">器乐段 / {section.label}</p>
              )}
            </section>
          ))}
        </section>

        <aside
          ref={dockRef}
          className="timing-debugger-console"
          aria-label="当前句播放切口控制台"
        >
          <p className="eyebrow">当前句播放切口</p>
          {selectedOccurrence ? (
            <>
              <dl className="timing-debugger-values">
                <div><dt>起点</dt><dd>{timingProvider.getTiming(selectedOccurrence).startMs} ms</dd></div>
                <div><dt>终点</dt><dd>{timingProvider.getTiming(selectedOccurrence).endMs} ms</dd></div>
              </dl>
              <div className="timing-debugger-adjustment-group">
                <span>起点</span>
                <div>
                  {[-100, -20, 20, 100].map((deltaMs) => (
                    <button key={deltaMs} type="button" onClick={() => updateSelectedTiming('startMs', deltaMs)}>
                      {deltaMs > 0 ? '+' : ''}{deltaMs}ms
                    </button>
                  ))}
                </div>
              </div>
              <div className="timing-debugger-adjustment-group">
                <span>终点</span>
                <div>
                  {[-100, -20, 20, 100].map((deltaMs) => (
                    <button key={deltaMs} type="button" onClick={() => updateSelectedTiming('endMs', deltaMs)}>
                      {deltaMs > 0 ? '+' : ''}{deltaMs}ms
                    </button>
                  ))}
                </div>
              </div>
              <div className="timing-debugger-console-actions">
                <button type="button" onClick={previewSelectedOccurrence} disabled={!playback.engine}>播放</button>
                <button type="button" onClick={save}>保存本机微调</button>
              </div>
            </>
          ) : null}
          {message ? <p className="timing-debugger-message" role="status">{message}</p> : null}
        </aside>
      </div>
    </main>
  )
}

function TimingDebuggerSelector({
  editions,
  homeHref,
  runtimeLocation,
}: {
  editions: readonly CatalogEdition[]
  homeHref: string
  runtimeLocation: Location
}) {
  return (
    <main className="timing-debugger timing-debugger-selector">
      <header className="timing-debugger-header">
        <div>
          <p className="eyebrow">设置 / 播放切口调试</p>
          <h1>选择一首歌</h1>
          <p className="timing-debugger-lede">选择 Song Edition 后，逐句试听并调整唯一的 startMs / endMs。</p>
        </div>
        <a className="text-link" href={homeHref}>返回曲库</a>
      </header>
      <ol className="timing-debugger-song-list">
        {editions.map((edition) => (
          <li key={edition.songId}>
            <a href={createTimingDebuggerHref(edition.songId, runtimeLocation)}>
              <span>{edition.title}</span>
              <small>{edition.artist}</small>
            </a>
          </li>
        ))}
      </ol>
    </main>
  )
}

function TimingDebuggerStatus({
  title,
  detail,
  homeHref,
  children,
}: {
  title: string
  detail: string
  homeHref: string
  children?: ReactNode
}) {
  return (
    <main className="timing-debugger timing-debugger-status" aria-labelledby="timing-status-title">
      <p className="eyebrow">播放切口调试</p>
      <h1 id="timing-status-title">{title}</h1>
      <p>{detail}</p>
      {children}
      <a className="text-link" href={homeHref}>返回曲库</a>
    </main>
  )
}
