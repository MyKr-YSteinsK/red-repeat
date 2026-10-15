import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import type { Catalog, CatalogEdition } from '../library/runtime-schema'
import {
  createContinueHref,
  createTimingDebuggerHref,
} from '../navigation'
import {
  createEffectiveOccurrenceTimingProvider,
  createTimingOverridesDocument,
  readTimingOverrideStorageSnapshot,
  readTimingOverrides,
  saveTimingOverrides,
  updateTimingOverride,
  type TimingOverrideIdentity,
  type TimingOverrideStorage,
  type TimingOverrideStorageSnapshot,
  type TimingOverridesReadResult,
} from '../practice/practice-timing-overrides'
import type { RuntimeClient } from '../runtime/runtime-client'
import type { RuntimeSongEditionCore } from '../runtime/song-edition-loader'
import { useSongEditionPlayback } from '../edition/use-song-edition-playback'
import { useSongEditionCore } from '../edition/use-song-edition-core'
import { LyricText } from '../edition/LyricText'
import {
  commitTimingEdit,
  createTimingEditHistory,
  isTimingEditDirty,
  markTimingEditSaved,
  redoTimingEdit,
  undoTimingEdit,
} from './timing-edit-history'

export type TimingDebuggerCatalogState =
  | { status: 'loading' }
  | { status: 'ready'; catalog: Catalog }
  | { status: 'error'; error: unknown }

export interface TimingDebuggerPageProps {
  songId?: string
  occurrenceId?: string
  returnToEdition?: boolean
  catalogState: TimingDebuggerCatalogState
  runtimeClient: RuntimeClient
  homeHref: string
  onRetryCatalog: () => void
  audioEngine?: AudioEngine
}

export function TimingDebuggerPage({
  songId,
  occurrenceId,
  returnToEdition,
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
      occurrenceId={occurrenceId}
      returnToEdition={returnToEdition}
      runtimeClient={runtimeClient}
      homeHref={homeHref}
      audioEngine={audioEngine}
    />
  )
}

function TimingDebuggerEdition({
  catalogEdition,
  occurrenceId,
  returnToEdition,
  runtimeClient,
  homeHref,
  audioEngine,
}: {
  catalogEdition: CatalogEdition
  occurrenceId?: string
  returnToEdition?: boolean
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
      key={`${loaded.core.edition.song.songId}:${loaded.core.edition.contentHash}:${loaded.core.edition.audio.sourceHash}:${loaded.core.edition.timelineUrl}`}
      core={loaded.core}
      occurrenceId={occurrenceId}
      returnToEdition={returnToEdition}
      runtimeClient={runtimeClient}
      homeHref={homeHref}
      audioEngine={audioEngine}
    />
  )
}

function TimingDebuggerReady({
  core,
  occurrenceId,
  returnToEdition,
  runtimeClient,
  homeHref,
  audioEngine,
}: {
  core: RuntimeSongEditionCore
  occurrenceId?: string
  returnToEdition?: boolean
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
  const initialStorageSnapshot = useMemo(
    () => readTimingOverridesSnapshot(identity, model.timeline.occurrences),
    [identity, model.timeline.occurrences],
  )
  const initialDocument = initialStorageSnapshot.readResult.kind === 'compatible'
    ? initialStorageSnapshot.readResult.document
    : createTimingOverridesDocument(identity)
  const [history, setHistory] = useState(() => createTimingEditHistory(initialDocument))
  const historyRef = useRef(history)
  const storageBaselineRef = useRef(initialStorageSnapshot.snapshot)
  const [storageConflict, setStorageConflict] = useState(
    !initialStorageSnapshot.available || isBlockingRead(initialStorageSnapshot.readResult),
  )
  const initialTargetExists = occurrenceId !== undefined &&
    Boolean(model.occurrencesById[occurrenceId])
  const [selectionState, setSelectionState] = useState(() => ({
    routeTarget: occurrenceId,
    selectedOccurrenceId: occurrenceId === undefined
      ? model.timeline.occurrences[0]?.id
      : initialTargetExists ? occurrenceId : undefined,
    invalidTargetId: occurrenceId !== undefined && !initialTargetExists
      ? occurrenceId || '（空）'
      : undefined,
  }))
  if (selectionState.routeTarget !== occurrenceId) {
    const targetExists = occurrenceId !== undefined &&
      Boolean(model.occurrencesById[occurrenceId])
    setSelectionState({
      routeTarget: occurrenceId,
      selectedOccurrenceId: occurrenceId === undefined
        ? selectionState.selectedOccurrenceId ?? model.timeline.occurrences[0]?.id
        : targetExists ? occurrenceId : undefined,
      invalidTargetId: occurrenceId !== undefined && !targetExists
        ? occurrenceId || '（空）'
        : undefined,
    })
  }
  const { selectedOccurrenceId, invalidTargetId } = selectionState
  const [message, setMessage] = useState<string>()
  const draftDocument = history.current
  const dirty = isTimingEditDirty(history)
  const timingProvider = useMemo(
    () => createEffectiveOccurrenceTimingProvider(model.timeline, draftDocument),
    [draftDocument, model.timeline],
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
    setSelectionState((current) => ({
      ...current,
      selectedOccurrenceId: occurrenceId,
      invalidTargetId: undefined,
    }))
    setMessage(undefined)
  }

  useEffect(() => {
    if (occurrenceId === undefined || invalidTargetId || selectedOccurrenceId !== occurrenceId) return
    const row = window.document.getElementById(`timing-occurrence-${encodeURIComponent(occurrenceId)}`)
    if (row && typeof row.scrollIntoView === 'function') {
      const reducedMotion = typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      row.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' })
    }
  }, [invalidTargetId, occurrenceId, selectedOccurrenceId])

  const updateSelectedTiming = (
    field: 'startMs' | 'endMs',
    deltaMs: number,
  ): void => {
    if (!selectedOccurrence || invalidTargetId) {
      return
    }
    try {
      const current = historyRef.current
      const currentProvider = createEffectiveOccurrenceTimingProvider(
        model.timeline,
        current.current,
      )
      const nextDocument = updateTimingOverride(
        current.current,
        selectedOccurrence,
        field,
        currentProvider.getTiming(selectedOccurrence)[field] + deltaMs,
      )
      const nextHistory = commitTimingEdit(current, nextDocument)
      historyRef.current = nextHistory
      setHistory(nextHistory)
      setMessage(undefined)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '播放切口无效。')
    }
  }

  const previewSelectedOccurrence = (): void => {
    if (!selectedOccurrence || !playback.engine || invalidTargetId) {
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

  const save = async (): Promise<void> => {
    if (invalidTargetId || !dirty || storageConflict) {
      return
    }
    const current = historyRef.current
    const result = await saveTimingOverrides(current.current, {
      occurrences: model.timeline.occurrences,
      expectedSnapshot: storageBaselineRef.current,
    })
    if (result.status === 'saved') {
      const persisted = readTimingOverrideStorageSnapshot(identity)
      if (persisted.status !== 'available') {
        setStorageConflict(true)
        setMessage('本机记录已写入，但无法重新核验存储；草稿保留为未确认状态。')
        return
      }
      storageBaselineRef.current = persisted
      const savedHistory = markTimingEditSaved(current)
      historyRef.current = savedHistory
      setHistory(savedHistory)
      setMessage('本机微调已保存。')
    } else {
      if (result.status === 'conflict') {
        setStorageConflict(true)
        setMessage('本机微调或其他标签页的数据已变化；本次未切换活动记录，草稿仍保留。请先导出保留记录并重新打开 Timing Debugger。')
      } else if (result.status === 'unavailable') {
        setMessage('本机存储或多标签页安全锁不可用；未保存，草稿仍保留。')
      } else if (result.status === 'invalid') {
        setStorageConflict(true)
        setMessage('检测到无法核验的本机 Timing 记录；未保存，草稿仍保留。')
      } else {
        setMessage('无法验证本机播放切口写入；未保存确认状态，草稿仍保留。')
      }
    }
  }

  const undo = (): void => {
    if (invalidTargetId) return
    const nextHistory = undoTimingEdit(historyRef.current)
    historyRef.current = nextHistory
    setHistory(nextHistory)
    setMessage(undefined)
  }

  const redo = (): void => {
    if (invalidTargetId) return
    const nextHistory = redoTimingEdit(historyRef.current)
    historyRef.current = nextHistory
    setHistory(nextHistory)
    setMessage(undefined)
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
        <a
          className="text-link"
          href={returnToEdition
            ? createContinueHref(core.edition.song.songId, window.location)
            : homeHref}
        >
          {returnToEdition ? '返回刚才的歌曲' : '返回曲库'}
        </a>
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
                      <li
                        key={occurrence.id}
                        id={`timing-occurrence-${encodeURIComponent(occurrence.id)}`}
                        className={isPrimary ? 'is-playing' : ''}
                      >
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
                    <button key={deltaMs} type="button" disabled={Boolean(invalidTargetId)} onClick={() => updateSelectedTiming('startMs', deltaMs)}>
                      {deltaMs > 0 ? '+' : ''}{deltaMs}ms
                    </button>
                  ))}
                </div>
              </div>
              <div className="timing-debugger-adjustment-group">
                <span>终点</span>
                <div>
                  {[-100, -20, 20, 100].map((deltaMs) => (
                    <button key={deltaMs} type="button" disabled={Boolean(invalidTargetId)} onClick={() => updateSelectedTiming('endMs', deltaMs)}>
                      {deltaMs > 0 ? '+' : ''}{deltaMs}ms
                    </button>
                  ))}
                </div>
              </div>
              <div className="timing-debugger-console-actions">
                <button type="button" onClick={undo} disabled={Boolean(invalidTargetId) || history.past.length === 0}>撤销</button>
                <button type="button" onClick={redo} disabled={Boolean(invalidTargetId) || history.future.length === 0}>重做</button>
                <button type="button" onClick={previewSelectedOccurrence} disabled={!playback.engine || Boolean(invalidTargetId)}>播放</button>
                <button
                  type="button"
                  onClick={save}
                  disabled={!dirty || Boolean(invalidTargetId) || storageConflict}
                >
                  保存本机微调
                </button>
              </div>
            </>
          ) : null}
          <p className="timing-debugger-save-state" role="status">
            {dirty ? '有未保存的微调' : '没有未保存的微调'}
          </p>
          {invalidTargetId ? (
            <p className="timing-debugger-message" role="alert">
              句子链接中的 Occurrence「{invalidTargetId}」在当前 Song Edition 中不存在。请选择正确的歌词行。
            </p>
          ) : null}
          {isDormantRead(initialStorageSnapshot.readResult) ? (
            <p className="timing-debugger-message" role="status">
              检测到其他完整 identity 的微调记录；它不会自动应用于当前 Edition，可在设置中单独查看和导出。
            </p>
          ) : null}
          {isBlockingRead(initialStorageSnapshot.readResult) ? (
            <p className="timing-debugger-message" role="alert">
              本机 Timing 记录无法安全核验；当前不会应用，也不能保存覆盖。可先在设置中导出可核验的保留记录。
            </p>
          ) : null}
          {!initialStorageSnapshot.available ? (
            <p className="timing-debugger-message" role="alert">
              无法读取本机微调存储；为保护已有数据，本次不能保存。
            </p>
          ) : null}
          {message ? <p className="timing-debugger-message" role="alert">{message}</p> : null}
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

function readTimingOverridesSnapshot(
  identity: TimingOverrideIdentity,
  occurrences: RuntimeSongEditionCore['assembled']['timeline']['occurrences'],
): {
  readResult: TimingOverridesReadResult
  snapshot: TimingOverrideStorageSnapshot
  available: boolean
} {
  let browserStorage: Storage
  try {
    browserStorage = window.localStorage
  } catch {
    return {
      readResult: { kind: 'storage-error' },
      snapshot: {
        status: 'unavailable',
        archiveActiveRaw: null,
        archiveRecordRaws: [],
        legacyV3Raw: null,
        legacySchemaRaws: [],
      },
      available: false,
    }
  }

  const captured = new Map<string, string | null>()
  let available = true
  const storage: TimingOverrideStorage = {
    getItem(key) {
      if (captured.has(key)) return captured.get(key) ?? null
      try {
        const value = browserStorage.getItem(key)
        captured.set(key, value)
        return value
      } catch (error) {
        available = false
        throw error
      }
    },
    setItem(key, value) {
      browserStorage.setItem(key, value)
    },
    removeItem(key) {
      browserStorage.removeItem(key)
    },
    get length() {
      return browserStorage.length
    },
    key(index) {
      return browserStorage.key(index)
    },
  }
  const snapshot = readTimingOverrideStorageSnapshot(identity, storage)
  const readResult = readTimingOverrides(identity, { occurrences, storage })
  return {
    readResult,
    snapshot,
    available: available && snapshot.status === 'available',
  }
}

function isBlockingRead(result: TimingOverridesReadResult): boolean {
  return result.kind === 'invalid' || result.kind === 'conflict' || result.kind === 'storage-error'
}

function isDormantRead(result: TimingOverridesReadResult): boolean {
  return result.kind === 'edition-stale' ||
    result.kind === 'audio-stale' ||
    result.kind === 'timeline-stale'
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
