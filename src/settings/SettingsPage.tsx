import { useEffect, useMemo, useState } from 'react'
import type { Catalog, CatalogEdition } from '../library/runtime-schema'
import {
  getTimingOverridesStorageKey,
  isTimingOverridesEmpty,
  listTimingOverrideArchive,
  readTimingOverrides,
  serializeTimingOverrideArchiveExport,
  type TimingOverrideArchiveListing,
  type TimingOverrideIdentity,
} from '../practice/practice-timing-overrides'
import { buildInfo } from '../release/build-info'
import type { RuntimeClient } from '../runtime/runtime-client'
import { getUpdateManager, type UpdateManager } from '../pwa/update-manager'
import { createTimingDebuggerHref } from '../navigation'
import { ReleaseHistory } from './ReleaseHistory'
import { SystemSettings } from './SystemSettings'
import { PersonalBackupPanel, type BackupImportUiState } from './PersonalBackupPanel'
import './settings-page.css'
import {
  createTimingExportFilename,
  createTimingExportMarkdown,
  type TimingExportSong,
} from './timing-export'
import {
  createBackupIdentity,
  emptyBackupPayload,
  parsePersonalBackup,
  preparePersonalBackupImport,
  serializePersonalBackup,
  commitPersonalBackupImport,
  type BackupCurrentEditionContext,
  type BackupStorage,
  type PersonalBackupDocument,
  type PersonalBackupDomain,
} from '../practice/personal-backup'
import {
  parsePracticeLearningStateForBackup,
  getPracticeStateStorageKey,
} from '../practice/practice-state'
import { getPracticeRateStorageKey, PRACTICE_PLAYBACK_RATES } from '../practice/practice-rate'
import { createPracticeIndex } from '../practice/practice-scope'
import {
  isResumeIdentityCompatible,
  parseResumeContext,
  RESUME_CONTEXT_STORAGE_KEY,
} from '../practice/resume-context'
import {
  parsePracticeQueue,
  PRACTICE_QUEUE_STORAGE_KEY,
  type PracticeQueueItem,
} from '../practice/practice-queue'
import {
  isLyricDisplayPreferences,
  LYRIC_DISPLAY_PREFERENCES_STORAGE_KEY,
} from '../edition/LyricDisplayPreferences'
import { loadValidatedSongContext } from '../practice/validated-song-context'

export type SettingsCatalogState =
  | { status: 'loading' }
  | { status: 'ready'; catalog: Catalog }
  | { status: 'error'; error: unknown }

export interface SettingsPageProps {
  catalogState: SettingsCatalogState
  runtimeClient: RuntimeClient
  homeHref: string
  onRetryCatalog: () => void
  updateManager?: UpdateManager
  highlightVersion?: string
}

type ExportSelection = 'all' | string
type ExportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'empty'; detail: string }
  | { status: 'error'; detail: string }
  | { status: 'success'; filename: string; markdown: string }

export function SettingsPage({
  catalogState,
  runtimeClient,
  homeHref,
  onRetryCatalog,
  updateManager: providedUpdateManager,
  highlightVersion,
}: SettingsPageProps) {
  const [selection, setSelection] = useState<ExportSelection>('all')
  const [exportState, setExportState] = useState<ExportState>({ status: 'idle' })
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupMessage, setBackupMessage] = useState<string>()
  const [backupImport, setBackupImport] = useState<BackupImportUiState>()
  const [timingArchiveListing, setTimingArchiveListing] = useState<TimingOverrideArchiveListing>(
    () => listTimingOverrideArchive(),
  )
  const [timingArchiveMessage, setTimingArchiveMessage] = useState<string>()
  const catalog = catalogState.status === 'ready' ? catalogState.catalog : undefined
  const settingsLocation = window.location
  const timingDebuggerHref = createTimingDebuggerHref(undefined, settingsLocation)
  useEffect(() => {
    const refreshArchiveListing = (): void => {
      setTimingArchiveListing(listTimingOverrideArchive())
    }
    refreshArchiveListing()
    window.addEventListener('storage', refreshArchiveListing)
    return () => window.removeEventListener('storage', refreshArchiveListing)
  }, [])

  const selectedEdition = useMemo(
    () =>
      selection === 'all'
        ? undefined
        : catalog?.editions.find((edition) => edition.songId === selection),
    [catalog, selection],
  )

  const handleExport = async (): Promise<void> => {
    if (!catalog || catalog.editions.length === 0) {
      setExportState({ status: 'empty', detail: '当前曲库没有可导出的歌曲。' })
      return
    }

    const editions = selectedEdition
      ? [selectedEdition]
      : [...catalog.editions]
    setExportState({ status: 'loading' })

    const loaded = await Promise.all(
      editions.map(async (catalogEdition) => {
        try {
          return {
            song: await loadTimingExportSong(runtimeClient, catalogEdition),
          }
        } catch (error) {
          return {
            error: `${catalogEdition.title}: ${describeExportError(error)}`,
          }
        }
      }),
    )
    const songs = loaded.flatMap(({ song }) => (song ? [song] : []))
    const errors = loaded.flatMap(({ error }) => (error ? [error] : []))

    if (songs.length === 0) {
      setExportState({
        status: errors.length > 0 ? 'error' : 'empty',
        detail:
          errors.length > 0
            ? errors.join('；')
            : '当前没有待合入的播放切口微调。',
      })
      return
    }

    const markdown = createTimingExportMarkdown(songs, buildInfo)
    const filename = createTimingExportFilename(selectedEdition?.songId)
    downloadTextFile(filename, markdown)
    setExportState({ status: 'success', filename, markdown })
  }

  const handlePersonalBackupExport = async (): Promise<void> => {
    if (!catalog) {
      setBackupMessage('曲库尚未就绪，暂时无法核验个人状态。')
      return
    }
    setBackupBusy(true)
    setBackupImport(undefined)
    setBackupMessage(undefined)
    try {
      const result = await collectPersonalBackup(catalog, runtimeClient, window.localStorage)
      const filename = `red-repeat-personal-backup-${new Date().toISOString().slice(0, 10)}.json`
      downloadJsonFile(filename, serializePersonalBackup(result.document))
      const skipped = result.skipped.length > 0
        ? `跳过 ${result.skipped.length} 项无法通过当前身份或格式核验的数据：${result.skipped.slice(0, 4).join('；')}${result.skipped.length > 4 ? '…' : ''}`
        : '所有已发现的数据域均通过当前可用身份核验。'
      setBackupMessage(`已下载 ${filename}。${skipped} 备份仅包含当前兼容的白名单用户状态，不包含历史 Timing 保留记录；历史记录需单独导出，也不包含歌曲资源、下载快照或未知本机数据。`)
    } catch (error) {
      setBackupMessage(`无法生成个人备份：${describeBackupError(error)}`)
    } finally {
      setBackupBusy(false)
    }
  }

  const handleTimingArchiveExport = (): void => {
    const listing = listTimingOverrideArchive()
    setTimingArchiveListing(listing)
    if (listing.status !== 'available') {
      setTimingArchiveMessage('无法读取本机 Timing 保留记录；没有生成导出文件。')
      return
    }
    if (listing.entries.length === 0) {
      setTimingArchiveMessage(listing.invalidCount > 0
        ? `没有可核验的 Timing 保留记录；发现 ${listing.invalidCount} 条无法核验数据，已原样留在本机。`
        : '当前没有可导出的 Timing 保留记录。')
      return
    }
    try {
      const filename = `red-repeat-timing-archive-${new Date().toISOString().slice(0, 10)}.json`
      const content = serializeTimingOverrideArchiveExport(listing)
      downloadJsonFile(filename, content)
      setTimingArchiveMessage(
        `已下载 ${filename}，包含 ${listing.entries.length} 条可核验的保留记录。旧 identity 不会自动应用于其他 Edition，也不能直接作为当前版 Timing Correction Export 合入。${listing.invalidCount > 0 ? `另有 ${listing.invalidCount} 条无法核验数据未导出，仍保留在本机。` : ''}`,
      )
    } catch (error) {
      setTimingArchiveMessage(`无法导出 Timing 保留记录：${describeBackupError(error)}`)
    }
  }

  const handlePersonalBackupFile = async (file: File | undefined): Promise<void> => {
    setBackupImport(undefined)
    setBackupMessage(undefined)
    if (!file) return
    if (file.size > 1_000_000) {
      setBackupMessage('备份文件超过 1 MB，已拒绝读取。')
      return
    }
    if (!catalog) {
      setBackupMessage('曲库尚未就绪；请等待曲库完成加载后再预览导入。')
      return
    }
    setBackupBusy(true)
    try {
      const backup = parsePersonalBackup(await file.text())
      const songIds = collectBackupSongIds(backup)
      const { contexts } = await loadBackupContexts(songIds, catalog, runtimeClient)
      const preview = preparePersonalBackupImport(backup, contexts, window.localStorage)
      setBackupImport({
        document: backup,
        fileName: file.name,
        preview,
        selectedDomains: [],
        overwriteDomains: [],
      })
      setBackupMessage('预览已完成。无法确认身份的条目会跳过，确认前本机数据保持原样。')
    } catch (error) {
      setBackupMessage(`无法预览个人备份：${describeBackupError(error)}`)
    } finally {
      setBackupBusy(false)
    }
  }

  const confirmPersonalBackupImport = (): void => {
    if (!backupImport) return
    const result = commitPersonalBackupImport(
      backupImport.preview,
      new Set(backupImport.selectedDomains),
      new Set(backupImport.overwriteDomains),
      window.localStorage,
    )
    if (result.status === 'committed') {
      setBackupImport(undefined)
      setBackupMessage(`已恢复 ${result.written} 项本机状态。返回曲库或重新打开歌曲后将读取更新后的值。`)
      return
    }
    if (result.status === 'unchanged') {
      setBackupMessage('没有可写入的已选择条目；本机数据未改变。')
      return
    }
    if (result.status === 'changed-since-preview') {
      setBackupImport(undefined)
      setBackupMessage('预览后本机状态发生变化，已取消写入。请重新选择文件并核对新预览。')
      return
    }
    if (result.status === 'rolled-back') {
      setBackupMessage(`写入失败，已逐项回滚并核验原值：${result.error}`)
      return
    }
    setBackupMessage(`严重：写入失败且至少一个回滚值无法验证。不要继续覆盖导入。错误：${result.error}；${result.rollbackErrors.join('；')}`)
  }

  return (
    <main className="settings" aria-labelledby="settings-title">
      <header className="settings-header">
        <h1 id="settings-title">设置</h1>
        <a className="text-link settings-back" href={homeHref}>返回曲库</a>
      </header>

      <SystemSettings
        catalog={catalog}
        catalogLoading={catalogState.status === 'loading'}
        updateManager={providedUpdateManager ?? getUpdateManager()}
      />

      <div className="settings-grid">
        <section className="settings-card settings-card-action" aria-labelledby="timing-settings-title">
          <h2 id="timing-settings-title">播放切口调试</h2>
          <p>逐句试听并调整播放起止点。学唱、全曲和讲解会使用这首歌的本机微调。</p>
          <a className="control-button control-button--primary settings-primary-link" href={timingDebuggerHref}>打开播放切口调试 →</a>
        </section>

        <PersonalBackupPanel
          ready={catalogState.status === 'ready'}
          busy={backupBusy}
          backup={backupImport}
          message={backupMessage}
          onExport={() => void handlePersonalBackupExport()}
          onFile={(file) => void handlePersonalBackupFile(file)}
          onSelectDomain={(domain, checked) => {
            setBackupImport((current) => current ? {
              ...current,
              selectedDomains: toggleDomain(current.selectedDomains, domain, checked),
              overwriteDomains: checked
                ? current.overwriteDomains
                : current.overwriteDomains.filter((item) => item !== domain),
            } : current)
          }}
          onOverwriteDomain={(domain, checked) => {
            setBackupImport((current) => current ? {
              ...current,
              overwriteDomains: toggleDomain(current.overwriteDomains, domain, checked),
            } : current)
          }}
          onConfirm={confirmPersonalBackupImport}
          onCancel={() => {
            setBackupImport(undefined)
            setBackupMessage('已取消导入。本机数据保持原样。')
          }}
        />

        <section className="settings-card settings-export" aria-labelledby="timing-export-title">
          <h2 id="timing-export-title">微调导出</h2>
          <p>把当前 Edition 的本机微调下载为 Markdown 修复包，供合入歌曲源。</p>
          {catalogState.status === 'loading' ? (
            <p className="settings-muted" role="status">正在读取曲库…</p>
          ) : catalogState.status === 'error' ? (
            <div className="settings-inline-error" role="alert">
              <p>曲库暂时无法读取。</p>
              <button type="button" className="text-button" onClick={onRetryCatalog}>重试</button>
            </div>
          ) : catalog && catalog.editions.length > 0 ? (
            <div className="settings-export-controls">
              <label>
                <span>导出范围</span>
                <select
                  aria-label="导出范围"
                  value={selection}
                  onChange={(event) => {
                    setSelection(event.currentTarget.value)
                    setExportState({ status: 'idle' })
                  }}
                >
                  <option value="all">全部歌曲</option>
                  {catalog.editions.map((edition) => (
                    <option key={edition.songId} value={edition.songId}>{edition.title}</option>
                  ))}
                </select>
              </label>
              <button className="control-button control-button--primary" type="button" onClick={() => void handleExport()} disabled={exportState.status === 'loading'}>
                {exportState.status === 'loading' ? '生成中…' : '生成并下载修复包'}
              </button>
            </div>
          ) : (
            <p className="settings-muted">曲库里还没有歌曲。</p>
          )}
          {exportState.status === 'empty' || exportState.status === 'error' ? (
            <p className="settings-export-message" role={exportState.status === 'error' ? 'alert' : 'status'}>
              {exportState.detail}
            </p>
          ) : null}
          {exportState.status === 'success' ? (
            <div className="settings-export-success" role="status">
              <p>已下载 {exportState.filename}。</p>
              <details>
                <summary>查看导出内容</summary>
                <pre>{exportState.markdown}</pre>
              </details>
            </div>
          ) : null}
        </section>

        <section className="settings-card settings-timing-archive" aria-labelledby="timing-archive-title">
          <h2 id="timing-archive-title">Timing 保留记录</h2>
          <p>旧 Edition 的微调会按完整 song、Edition、audio 与 Timeline identity 保留，不会仅凭同一首歌自动应用于新版；只有活动 Edition 完整匹配时才参与播放。此导出不能直接作为当前版 Timing Correction Export 合入。</p>
          {timingArchiveListing.status === 'unavailable' ? (
            <p className="settings-inline-error" role="alert">无法读取本机 Timing 保留记录。</p>
          ) : timingArchiveListing.entries.length > 0 ? (
            <details className="settings-disclosure">
              <summary>查看 {timingArchiveListing.entries.length} 条可核验记录</summary>
              <ul className="settings-timing-archive-list">
                {timingArchiveListing.entries.map((entry, index) => (
                  <li key={`${entry.identity.songId}-${entry.identity.editionContentHash}-${index}`}>
                    <strong>{entry.identity.songId}</strong>
                    <small>
                      Edition {entry.identity.editionContentHash.slice(0, 12)} · audio {entry.identity.audioSourceHash.slice(0, 12)} · {Object.keys(entry.document.occurrences).length} 个 Occurrence · {entry.source === 'archive' ? '已保留' : '旧版 v3 槽'}
                    </small>
                    <small>Timeline {entry.identity.baseTimelineUrl}</small>
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <p className="settings-muted">当前没有可核验的 Timing 保留记录。</p>
          )}
          {timingArchiveListing.invalidCount > 0 ? (
            <p className="settings-muted">发现 {timingArchiveListing.invalidCount} 条无法核验的本机记录；它们未被应用或导出，仍留在本机。</p>
          ) : null}
          <button
            className="control-button control-button--quiet"
            type="button"
            disabled={timingArchiveListing.status !== 'available' || timingArchiveListing.entries.length === 0}
            onClick={handleTimingArchiveExport}
          >
            导出保留的 Timing JSON
          </button>
          {timingArchiveMessage ? <p className="settings-export-message" role="status">{timingArchiveMessage}</p> : null}
        </section>

      </div>

      <ReleaseHistory highlightVersion={highlightVersion} />
    </main>
  )
}

async function collectPersonalBackup(
  catalog: Catalog,
  runtimeClient: RuntimeClient,
  storage: BackupStorage,
): Promise<{ document: PersonalBackupDocument; skipped: string[] }> {
  const payload = emptyBackupPayload()
  const skipped: string[] = []
  const timingArchive = listTimingOverrideArchive(storage)
  if (timingArchive.status !== 'available') {
    skipped.push('无法枚举本机 Timing 归档；本次未核验该数据域')
  }
  const timingArchiveSongIds = new Set(
    timingArchive.status === 'available'
      ? timingArchive.entries.map(({ identity }) => identity.songId)
      : [],
  )
  const preferenceRaw = storage.getItem(LYRIC_DISPLAY_PREFERENCES_STORAGE_KEY)
  if (preferenceRaw !== null) {
    const value = parseJson(preferenceRaw)
    if (isLyricDisplayPreferences(value)) payload.lyricDisplayPreferences = value
    else skipped.push('歌词显示偏好格式无效')
  }
  const resumeRaw = storage.getItem(RESUME_CONTEXT_STORAGE_KEY)
  const resumeContext = resumeRaw ? parseResumeContext(parseJson(resumeRaw)) : undefined
  if (resumeRaw && !resumeContext) skipped.push('最近学习位置格式无效')
  const queueRaw = storage.getItem(PRACTICE_QUEUE_STORAGE_KEY)
  const practiceQueue = queueRaw ? parsePracticeQueue(parseJson(queueRaw)) : undefined
  if (queueRaw && !practiceQueue) skipped.push('待练队列格式无效')

  const candidateIds = new Set<string>()
  for (const edition of catalog.editions) {
    if (
      storage.getItem(getPracticeStateStorageKey(edition.songId)) !== null ||
      storage.getItem(getPracticeRateStorageKey(edition.songId)) !== null ||
      storage.getItem(getTimingOverridesStorageKey(edition.songId)) !== null ||
      timingArchiveSongIds.has(edition.songId)
    ) candidateIds.add(edition.songId)
  }
  if (resumeContext) candidateIds.add(resumeContext.songId)
  practiceQueue?.items.forEach(({ songId }) => candidateIds.add(songId))
  const { contexts, errors } = await loadBackupContexts([...candidateIds], catalog, runtimeClient)
  skipped.push(...errors)

  for (const edition of catalog.editions) {
    const context = contexts.get(edition.songId)
    const identity = context ? createBackupIdentity(context.edition) : undefined
    const practiceRaw = storage.getItem(getPracticeStateStorageKey(edition.songId))
    if (practiceRaw !== null) {
      const value = parseJson(practiceRaw)
      const state = context && value !== undefined
        ? parsePracticeLearningStateForBackup(value, context.practice, context.timeline)
        : undefined
      if (identity && state) payload.practice.push({ identity, value: state })
      else skipped.push(`${edition.songId} Practice 状态无法通过当前身份核验`)
    }
    const rateRaw = storage.getItem(getPracticeRateStorageKey(edition.songId))
    if (rateRaw !== null) {
      const rate = Number(rateRaw)
      if (identity && PRACTICE_PLAYBACK_RATES.some((value) => value === rate) && String(rate) === rateRaw) {
        payload.rates.push({ identity, value: rate })
      } else skipped.push(`${edition.songId} 速度数据无效或当前身份不可用`)
    }
    if (context && identity) {
      const timingIdentity: TimingOverrideIdentity = {
        songId: identity.songId,
        editionContentHash: identity.editionContentHash,
        audioSourceHash: identity.audioSourceHash,
        baseTimelineUrl: identity.timelineUrl,
      }
      const timing = readTimingOverrides(timingIdentity, {
        occurrences: context.timeline.occurrences,
        storage,
      })
      const allTimingOccurrencesExist = timing.kind === 'compatible' &&
        Object.keys(timing.document.occurrences).every((occurrenceId) =>
          context.timeline.occurrences.some(({ id }) => id === occurrenceId),
        )
      if (timing.kind === 'compatible' && allTimingOccurrencesExist &&
        !isTimingOverridesEmpty(timing.document)) {
        payload.timingOverrides.push({ identity, value: timing.document })
      } else if (timing.kind !== 'none') {
        skipped.push(`${edition.songId} timing override 不兼容或无效，未导出`)
      }
    } else if (storage.getItem(getTimingOverridesStorageKey(edition.songId)) !== null) {
      skipped.push(`${edition.songId} timing override 缺少当前身份，未导出`)
    }
  }

  if (resumeContext) {
    const context = contexts.get(resumeContext.songId)
    if (context && resumeIsCurrent(resumeContext, context)) payload.resumeContext = resumeContext
    else skipped.push('最近学习位置与当前完整 Song Edition 不兼容，未导出')
  }
  if (practiceQueue) {
    const items: PracticeQueueItem[] = []
    for (const item of practiceQueue.items) {
      const context = contexts.get(item.songId)
      if (context && queueItemIsCurrent(item, context)) items.push(item)
      else skipped.push(`${item.songId}/${item.occurrenceId} 待练项身份或目标无效，未导出`)
    }
    payload.practiceQueue = { schemaVersion: 1, items }
  }

  const document: PersonalBackupDocument = {
    format: 'red-repeat-personal-backup',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    payload,
  }
  return { document: parsePersonalBackup(serializePersonalBackup(document)), skipped }
}

function collectBackupSongIds(backup: PersonalBackupDocument): string[] {
  const ids = new Set<string>()
  backup.payload.practice.forEach(({ identity }) => ids.add(identity.songId))
  backup.payload.rates.forEach(({ identity }) => ids.add(identity.songId))
  backup.payload.timingOverrides.forEach(({ identity }) => ids.add(identity.songId))
  if (backup.payload.resumeContext) ids.add(backup.payload.resumeContext.songId)
  backup.payload.practiceQueue?.items.forEach(({ songId }) => ids.add(songId))
  return [...ids]
}

async function loadBackupContexts(
  songIds: readonly string[],
  catalog: Catalog,
  runtimeClient: RuntimeClient,
): Promise<{ contexts: Map<string, BackupCurrentEditionContext>; errors: string[] }> {
  const contexts = new Map<string, BackupCurrentEditionContext>()
  const errors: string[] = []
  const editions = songIds.flatMap((songId) => {
    const edition = catalog.editions.find((candidate) => candidate.songId === songId)
    if (!edition) {
      errors.push(`${songId} 不在当前公开曲库中`)
      return []
    }
    return [edition]
  })
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < editions.length) {
      const edition = editions[next++]
      try {
        const core = await loadValidatedSongContext(runtimeClient, edition)
        contexts.set(edition.songId, {
          edition: core.edition,
          practice: core.practice,
          timeline: core.timeline,
          segmentIds: new Set(Object.keys(core.assembled.segmentsById)),
        })
      } catch {
        errors.push(`${edition.songId} 当前 Runtime 核验失败`)
      }
    }
  }
  await Promise.all([worker(), worker(), worker()])
  return { contexts, errors }
}

function resumeIsCurrent(
  resume: NonNullable<ReturnType<typeof parseResumeContext>>,
  context: BackupCurrentEditionContext,
): boolean {
  const identity = createBackupIdentity(context.edition)
  if (!isResumeIdentityCompatible(resume, identity)) return false
  if (resume.mode === 'practice') {
    if (!resume.occurrenceId) return false
    const index = createPracticeIndex(context.practice, context.timeline)
    return index.unitIdByOccurrenceId.get(resume.occurrenceId) === resume.practiceUnitId
  }
  if (resume.mode === 'all') {
    return Boolean(resume.occurrenceId && context.timeline.occurrences.some(({ id }) => id === resume.occurrenceId))
  }
  return Boolean(resume.featureId && context.edition.features.some(({ id }) => id === resume.featureId))
}

function queueItemIsCurrent(item: PracticeQueueItem, context: BackupCurrentEditionContext): boolean {
  const identity = createBackupIdentity(context.edition)
  if (
    item.songId !== identity.songId ||
    item.editionContentHash !== identity.editionContentHash ||
    item.audioSourceHash !== identity.audioSourceHash ||
    item.timelineUrl !== identity.timelineUrl ||
    !context.segmentIds.has(item.segmentId)
  ) return false
  try {
    const index = createPracticeIndex(context.practice, context.timeline)
    return index.unitIdByOccurrenceId.get(item.occurrenceId) === item.practiceUnitId
  } catch {
    return false
  }
}

function parseJson(raw: string): unknown {
  try { return JSON.parse(raw) as unknown } catch { return undefined }
}

function downloadJsonFile(filename: string, value: string): void {
  const blob = new Blob([value], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function toggleDomain(
  current: readonly PersonalBackupDomain[],
  domain: PersonalBackupDomain,
  selected: boolean,
): PersonalBackupDomain[] {
  return selected
    ? [...new Set([...current, domain])]
    : current.filter((value) => value !== domain)
}

function describeBackupError(error: unknown): string {
  return error instanceof Error ? error.message : '发生未知本地处理错误。'
}

async function loadTimingExportSong(
  runtimeClient: RuntimeClient,
  catalogEdition: CatalogEdition,
): Promise<TimingExportSong | undefined> {
  const edition = await runtimeClient.loadEdition(catalogEdition.editionUrl)
  const [lyrics, timeline] = await Promise.all([
    runtimeClient.loadLyrics(edition.lyricsUrl),
    runtimeClient.loadTimeline(edition.timelineUrl),
  ])
  const identity: TimingOverrideIdentity = {
    songId: edition.song.songId,
    editionContentHash: edition.contentHash,
    audioSourceHash: edition.audio.sourceHash,
    baseTimelineUrl: edition.timelineUrl,
  }
  const stored = readTimingOverrides(identity, { occurrences: timeline.occurrences })
  if (stored.kind !== 'compatible') {
    return undefined
  }
  if (Object.keys(stored.document.occurrences).length === 0) {
    return undefined
  }
  return { edition, lyrics, timeline, overrides: stored.document }
}

function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function describeExportError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'Runtime 内容读取失败。'
}
