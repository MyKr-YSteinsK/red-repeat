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
import './timing-debugger.css'

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
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string }>()
  const [saving, setSaving] = useState(false)
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
  const selectedRow = selectedOccurrenceId ? model.occurrencesById[selectedOccurrenceId] : undefined
  const selectedOccurrence = selectedRow?.occurrence
  const displayedTiming = selectedOccurrence ? timingProvider.getTiming(selectedOccurrence) : undefined
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
    revealTimingRow(occurrenceId)
  }, [invalidTargetId, occurrenceId, selectedOccurrenceId])

  const updateSelectedTiming = (
    field: 'startMs' | 'endMs',
    deltaMs: number,
  ): void => {
    if (!selectedOccurrence || invalidTargetId || saving) {
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
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : '播放切口无效。' })
    }
  }

  const previewSelectedOccurrence = (): void => {
    if (!selectedOccurrence || !playback.engine || invalidTargetId) {
      setMessage({ tone: 'error', text: '当前环境无法播放音频。' })
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
          setMessage({ tone: 'error', text: completion.error.message })
        }
      })
  }

  const save = async (): Promise<void> => {
    if (invalidTargetId || !dirty || storageConflict || saving) return

    setSaving(true)
    setMessage(undefined)
    try {
      const current = historyRef.current
      const result = await saveTimingOverrides(current.current, {
        occurrences: model.timeline.occurrences,
        expectedSnapshot: storageBaselineRef.current,
      })
      if (result.status === 'saved') {
        const persisted = readTimingOverrideStorageSnapshot(identity)
        if (persisted.status !== 'available') {
          setStorageConflict(true)
          setMessage({ tone: 'error', text: '本机记录已写入，但无法重新核验存储。草稿仍待确认。' })
          return
        }
        storageBaselineRef.current = persisted
        const savedHistory = markTimingEditSaved(current)
        historyRef.current = savedHistory
        setHistory(savedHistory)
        setMessage({ tone: 'success', text: '本机微调已保存。' })
      } else if (result.status === 'conflict') {
        setStorageConflict(true)
        setMessage({ tone: 'error', text: '本机微调或其他标签页的数据已变化。本次保留草稿和原记录。请先导出保留记录，再重新打开调试台。' })
      } else if (result.status === 'unavailable') {
        setMessage({ tone: 'error', text: '本机存储或多标签页安全锁不可用。保存未完成，草稿已保留。' })
      } else if (result.status === 'invalid') {
        setStorageConflict(true)
        setMessage({ tone: 'error', text: '本机 Timing 记录无法核验。保存未完成，草稿已保留。' })
      } else {
        setMessage({ tone: 'error', text: '无法验证本机播放切口写入。保存未完成，草稿已保留。' })
      }
    } finally {
      setSaving(false)
    }
  }

  const undo = (): void => {
    if (invalidTargetId || saving) return
    const nextHistory = undoTimingEdit(historyRef.current)
    historyRef.current = nextHistory
    setHistory(nextHistory)
    setMessage(undefined)
  }

  const redo = (): void => {
    if (invalidTargetId || saving) return
    const nextHistory = redoTimingEdit(historyRef.current)
    historyRef.current = nextHistory
    setHistory(nextHistory)
    setMessage(undefined)
  }

  const selectRelative = (offset: -1 | 1): void => {
    const target = chronologicalOccurrences[selectedIndex + offset]
    if (target) {
      selectOccurrence(target.id)
      revealTimingRow(target.id)
    }
  }

  useLayoutEffect(() => {
    const debuggerElement = debuggerRef.current
    const dock = dockRef.current
    if (!debuggerElement || !dock) {
      return
    }

    const updateDockOcclusion = (): void => {
      const viewport = window.visualViewport
      const viewportBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight
      const dockRect = dock.getBoundingClientRect()
      const bottomOffset = Math.max(0, viewportBottom - dockRect.bottom)
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
          <h1>播放切口调试</h1>
          <p className="timing-debugger-lede">试听每句的起点和终点。保存后，学唱、全曲和讲解使用这份本机微调。</p>
        </div>
        <a
          className="text-link return-link"
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
            <h2 id="timing-song-title">{core.edition.song.title}</h2>
            <p>{core.edition.song.artist}</p>
          </div>
          <div className="timing-debugger-identity">
            <span>{core.edition.song.songId}</span>
            <span>Edition {core.edition.contentHash.slice(0, 12)}</span>
          </div>
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
          <div className="timing-debugger-console-body" tabIndex={0} role="region" aria-label="当前句和时间微调">
            <div className="timing-debugger-console-heading">
              <h2>当前句</h2>
              <p className="timing-debugger-save-state" role="status" data-dirty={dirty}>
                {saving ? '正在保存…' : dirty ? '有未保存的微调' : '没有未保存的微调'}
              </p>
            </div>
            {selectedRow && displayedTiming ? (
              <>
                <div className="timing-debugger-selection">
                  <p>
                    <span className="timing-debugger-position">
                      {selectedRow.occurrence.id} · {selectedIndex + 1} / {chronologicalOccurrences.length}
                    </span>
                    <LyricText segment={selectedRow.segment} />
                  </p>
                  <div className="timing-debugger-transport" role="group" aria-label="选择相邻歌词">
                    <button type="button" onClick={() => selectRelative(-1)} disabled={selectedIndex <= 0}>上一句</button>
                    <button
                      type="button"
                      onClick={() => selectRelative(1)}
                      disabled={selectedIndex < 0 || selectedIndex >= chronologicalOccurrences.length - 1}
                    >
                      下一句
                    </button>
                  </div>
                </div>
                <div className="timing-debugger-adjustments">
                  <TimingAdjustment
                    label="起点"
                    value={displayedTiming.startMs}
                    original={selectedRow.occurrence.startMs}
                    disabled={saving}
                    onAdjust={(delta) => updateSelectedTiming('startMs', delta)}
                  />
                  <TimingAdjustment
                    label="终点"
                    value={displayedTiming.endMs}
                    original={selectedRow.occurrence.endMs}
                    disabled={saving}
                    onAdjust={(delta) => updateSelectedTiming('endMs', delta)}
                  />
                </div>
              </>
            ) : null}
            {invalidTargetId ? (
              <p className="timing-debugger-message" role="alert" data-tone="error">
                句子链接中的 Occurrence「{invalidTargetId}」在当前 Song Edition 中不存在。请选择正确的歌词行。
              </p>
            ) : null}
            {isDormantRead(initialStorageSnapshot.readResult) ? (
              <p className="timing-debugger-message" role="status">
                检测到其他完整 identity 的微调记录。设置中可查看和导出，当前 Edition 只使用身份匹配的记录。
              </p>
            ) : null}
            {isBlockingRead(initialStorageSnapshot.readResult) ? (
              <p className="timing-debugger-message" role="alert" data-tone="error">
                本机 Timing 记录无法安全核验，禁止覆盖。可先在设置中导出可核验的保留记录。
              </p>
            ) : null}
            {!initialStorageSnapshot.available ? (
              <p className="timing-debugger-message" role="alert" data-tone="error">
                无法读取本机微调存储。保存已停用。
              </p>
            ) : null}
          </div>
          {message ? (
            <p
              className="timing-debugger-message timing-debugger-feedback"
              role={message.tone === 'error' ? 'alert' : 'status'}
              data-tone={message.tone}
            >
              {message.text}
            </p>
          ) : null}
          {selectedOccurrence ? (
            <div className="timing-debugger-console-actions">
              <button type="button" onClick={undo} disabled={saving || history.past.length === 0}>撤销</button>
              <button type="button" onClick={redo} disabled={saving || history.future.length === 0}>重做</button>
              <button type="button" onClick={previewSelectedOccurrence} disabled={!playback.engine}>试听</button>
              <button
                className="timing-debugger-save"
                type="button"
                onClick={() => void save()}
                disabled={!dirty || storageConflict || saving}
              >
                保存本机微调
              </button>
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  )
}

function TimingAdjustment({
  label, value, original, disabled, onAdjust,
}: {
  label: string
  value: number
  original: number
  disabled: boolean
  onAdjust: (delta: number) => void
}) {
  const difference = value - original
  return (
    <div className="timing-debugger-adjustment-group" role="group" aria-label={label}>
      <dl className="timing-debugger-values">
        <dt>{label}</dt>
        <dd>{value} ms</dd>
        {difference !== 0 ? (
          <dd className="timing-debugger-difference" aria-label="相对原始值">
            {difference > 0 ? '+' : ''}{difference} ms
          </dd>
        ) : null}
      </dl>
      <div className="timing-debugger-adjustment-buttons">
        {[-100, -20, 20, 100].map((delta) => (
          <button key={delta} type="button" disabled={disabled} onClick={() => onAdjust(delta)}>
            {delta > 0 ? '+' : ''}{delta}ms
          </button>
        ))}
      </div>
    </div>
  )
}

function revealTimingRow(occurrenceId: string): void {
  const row = document.getElementById(`timing-occurrence-${encodeURIComponent(occurrenceId)}`)
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  row?.scrollIntoView?.({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' })
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
          <p className="timing-debugger-context">播放切口调试</p>
          <h1>选择一首歌</h1>
          <p className="timing-debugger-lede">打开一首歌，试听并微调每句歌词的播放起止点。</p>
        </div>
        <a className="text-link return-link" href={homeHref}>返回曲库</a>
      </header>
      <ol className="timing-debugger-song-list">
        {editions.map((edition) => (
          <li key={edition.songId}>
            <a href={createTimingDebuggerHref(edition.songId, runtimeLocation)}>
              <span className="timing-debugger-song-link-copy">
                <strong>{edition.title}</strong>
                <small>{edition.artist}</small>
              </span>
              <span className="timing-debugger-chevron" aria-hidden="true">›</span>
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
      <a className="text-link return-link" href={homeHref}>返回曲库</a>
    </main>
  )
}
