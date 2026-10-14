import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  RUNTIME_CONTRACT_VERSION,
  type Catalog,
  type CatalogEdition,
} from '../library/runtime-schema'
import {
  getTimingOverridesStorageKey,
  clearTimingOverrides,
  isTimingOverridesEmpty,
  readTimingOverrides,
  type TimingOverrideIdentity,
} from '../practice/practice-timing-overrides'
import { buildInfo } from '../release/build-info'
import { RELEASES } from '../release/releases'
import { groupReleaseLedger } from '../release/release-grouping'
import { compareSemVer } from '../release/semver'
import type { RuntimeClient } from '../runtime/runtime-client'
import {
  describeUpdateStatus,
  getUpdateManager,
  type UpdateManager,
} from '../pwa/update-manager'
import type { RemoteReleaseNote } from '../pwa/version-probe'
import { createTimingDebuggerHref } from '../navigation'
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
  type PersonalBackupImportPreview,
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

interface BackupImportUiState {
  document: PersonalBackupDocument
  preview: PersonalBackupImportPreview
  selectedDomains: PersonalBackupDomain[]
  overwriteDomains: PersonalBackupDomain[]
}

export function SettingsPage({
  catalogState,
  runtimeClient,
  homeHref,
  onRetryCatalog,
  updateManager: providedUpdateManager,
  highlightVersion,
}: SettingsPageProps) {
  const currentUpdateManager = providedUpdateManager ?? getUpdateManager()
  const updateSnapshot = useSyncExternalStore(
    currentUpdateManager.subscribe,
    currentUpdateManager.getSnapshot,
    currentUpdateManager.getSnapshot,
  )
  const offlineStatus = useOfflineStatus()
  const [selection, setSelection] = useState<ExportSelection>('all')
  const [exportState, setExportState] = useState<ExportState>({ status: 'idle' })
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupMessage, setBackupMessage] = useState<string>()
  const [backupImport, setBackupImport] = useState<BackupImportUiState>()
  const catalog = catalogState.status === 'ready' ? catalogState.catalog : undefined
  const settingsLocation = window.location
  const timingDebuggerHref = createTimingDebuggerHref(undefined, settingsLocation)
  const releaseGrouping = groupReleaseLedger(RELEASES)
  const highlightedMilestoneVersion = highlightVersion
    ? releaseGrouping.milestoneGroups.find((group) =>
      group.children.some((release) => release.version === highlightVersion),
    )?.milestoneVersion ?? releaseGrouping.milestoneGroups[0]?.milestoneVersion
    : undefined
  const remote = updateSnapshot.remote
  const remoteVersion = remote?.version
  const remoteHasUpdate = Boolean(
    remote && (
      compareSemVer(remote.version, buildInfo.version) > 0 ||
      (compareSemVer(remote.version, buildInfo.version) === 0 &&
        remote.commit !== buildInfo.commit)
    ),
  )
  const candidateRemoteRelease = remote?.release
  const remoteRelease = remoteHasUpdate &&
    candidateRemoteRelease?.version === remoteVersion
    ? candidateRemoteRelease
    : undefined
  const backupDomainSummary = backupImport
    ? summarizeBackupDomains(backupImport.preview)
    : []

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
      setBackupMessage(`已下载 ${filename}。${skipped} 备份仅包含用户状态，不包含歌曲资源、下载快照或未知本机数据。`)
    } catch (error) {
      setBackupMessage(`无法生成个人备份：${describeBackupError(error)}`)
    } finally {
      setBackupBusy(false)
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
        preview,
        selectedDomains: [],
        overwriteDomains: [],
      })
      setBackupMessage('预览已完成；当前尚未写入任何本机数据。无法确认身份的条目会跳过。')
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
        <div>
          <p className="eyebrow">RED:REPEAT / 设置</p>
          <h1 id="settings-title">设置</h1>
          <p className="settings-lede">查看当前产品构建、曲库状态，并把人工播放切口交给 Codex 合入 source。</p>
        </div>
        <a className="text-link" href={homeHref}>返回曲库</a>
      </header>

      <div className="settings-grid">
        <section className="settings-card" aria-labelledby="system-info-title">
          <div className="settings-card-heading">
            <p className="eyebrow">系统信息</p>
            <h2 id="system-info-title">当前环境</h2>
          </div>
          <dl className="settings-facts">
            <div><dt>产品版本</dt><dd>{buildInfo.version}</dd></div>
            <div><dt>Build SHA</dt><dd>{buildInfo.commit}</dd></div>
            <div><dt>发布环境</dt><dd>{buildInfo.environment}</dd></div>
            <div><dt>Runtime contract</dt><dd>v{RUNTIME_CONTRACT_VERSION}</dd></div>
            <div><dt>曲库歌曲</dt><dd>{catalog?.editions.length ?? '读取中…'}</dd></div>
            <div><dt>Catalog hash</dt><dd>{catalog?.contentHash.slice(0, 12) ?? '读取中…'}</dd></div>
            <div><dt>PWA / offline cache</dt><dd>{offlineStatusLabel(offlineStatus)}</dd></div>
          </dl>
          <section className="settings-update-panel" aria-labelledby="app-update-title">
            <p className="eyebrow">PWA / 更新</p>
            <h3 id="app-update-title">应用更新</h3>
            <p className="settings-update-version">
              当前版本 <strong>{buildInfo.version}</strong>
            </p>
            <div className="settings-update-actions">
              <button
                className="control-button control-button--quiet"
                type="button"
                onClick={() => void currentUpdateManager.checkForUpdate({ manual: true })}
                disabled={updateSnapshot.status === 'checking'}
              >
                {updateSnapshot.status === 'checking' ? '检查中…' : '检查更新'}
              </button>
            </div>
            <p className="settings-update-status" role="status" aria-live="polite">
              {describeUpdateStatus(updateSnapshot)}
            </p>
            {updateSnapshot.status === 'error' && updateSnapshot.error ? (
              <p className="settings-update-error">{updateSnapshot.error}</p>
            ) : null}
            {updateSnapshot.checkedAt !== undefined ? (
              <dl className="settings-remote-build" data-update-build>
                {remote ? (
                  <>
                    <div><dt>线上版本</dt><dd>{remote.version}</dd></div>
                    <div><dt>线上 Build SHA</dt><dd>{remote.commit}</dd></div>
                    <div><dt>线上构建时间</dt><dd>{remote.builtAt}</dd></div>
                  </>
                ) : null}
                <div><dt>最近检查</dt><dd>{formatTimestamp(updateSnapshot.checkedAt)}</dd></div>
              </dl>
            ) : null}
            {remoteHasUpdate ? (
              remoteRelease ? (
                <section className="settings-remote-release" data-remote-release aria-labelledby="remote-release-title">
                  <p className="eyebrow">待更新版本 {remoteRelease.version}</p>
                  <h4 id="remote-release-title">远端更新说明</h4>
                  <ReleaseEntry release={remoteRelease} />
                </section>
              ) : (
                <p className="settings-update-note" data-remote-release-unavailable>
                  发现新版本，但暂时无法读取更新说明。
                </p>
              )
            ) : null}
          </section>
        </section>

        <section className="settings-card settings-card-action" aria-labelledby="timing-settings-title">
          <div className="settings-card-heading">
            <p className="eyebrow">内容作业</p>
            <h2 id="timing-settings-title">播放切口调试</h2>
          </div>
          <p>逐句校准唯一的 startMs / endMs。微调只保存在本机，学唱、全曲和讲解会即时共同消费。</p>
          <a className="settings-primary-link" href={timingDebuggerHref}>打开播放切口调试 →</a>
        </section>

        <section className="settings-card settings-export" aria-labelledby="timing-export-title">
          <div className="settings-card-heading">
            <p className="eyebrow">内容作业</p>
            <h2 id="timing-export-title">微调导出</h2>
          </div>
          <p>生成可以直接交给 Codex 的 Markdown 修复包；没有本机微调的歌曲不会被导出。</p>
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

        <section className="settings-card settings-personal-backup" aria-labelledby="personal-backup-title">
          <div className="settings-card-heading">
            <p className="eyebrow">仅本机文件</p>
            <h2 id="personal-backup-title">个人状态备份</h2>
          </div>
          <p>导出或恢复经过身份核验的进度、速度、歌词显示偏好、最近位置、待练队列和兼容 timing overrides。文件只由浏览器下载或读取；不含音频、歌曲 Runtime、离线下载记录、cookie 或未知本机数据。</p>
          <div className="personal-backup-actions">
            <button
              className="control-button control-button--primary"
              type="button"
              disabled={backupBusy || catalogState.status !== 'ready'}
              onClick={() => void handlePersonalBackupExport()}
            >
              {backupBusy ? '处理中…' : '导出个人备份 JSON'}
            </button>
            <label className="personal-backup-file">
              <span>选择本机 JSON 备份</span>
              <input
                type="file"
                accept="application/json,.json"
                disabled={backupBusy || catalogState.status !== 'ready'}
                onChange={(event) => {
                  void handlePersonalBackupFile(event.currentTarget.files?.[0])
                  event.currentTarget.value = ''
                }}
              />
            </label>
          </div>
          <p className="personal-backup-safety-note">导入预览和确认前不会写入状态。默认保留现有值；覆盖冲突需为对应数据域单独勾选。多键写入失败时会尝试逐键补偿回滚并核验。浏览器 localStorage 不提供跨标签页或断电原子事务。</p>
          {backupMessage ? <p className="personal-backup-message" role="status">{backupMessage}</p> : null}
          {backupImport ? (
            <div className="personal-backup-preview" aria-label="个人备份导入预览">
              <h3>导入预览</h3>
              <p>生成于 {backupImport.document.createdAt}。请只选择需要恢复的数据域；未选中的域不写入。</p>
              {backupDomainSummary.length === 0 ? (
                <p>备份中没有可恢复的白名单数据。</p>
              ) : (
                <ul>
                  {backupDomainSummary.map(({ domain, newCount, conflicts, unchanged, skipped }) => {
                    const selected = backupImport.selectedDomains.includes(domain)
                    const overwrite = backupImport.overwriteDomains.includes(domain)
                    return (
                      <li key={domain} className="personal-backup-domain">
                        <label>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) => {
                              const checked = event.currentTarget.checked
                              setBackupImport((current) => current ? {
                                ...current,
                                selectedDomains: toggleDomain(current.selectedDomains, domain, checked),
                                overwriteDomains: checked
                                  ? current.overwriteDomains
                                  : current.overwriteDomains.filter((item) => item !== domain),
                              } : current)
                            }}
                          />
                          {backupDomainLabel(domain)}：新增 {newCount}，已有冲突 {conflicts}，相同 {unchanged}，跳过 {skipped}
                        </label>
                        {conflicts > 0 ? (
                          <label className="personal-backup-overwrite">
                            <input
                              type="checkbox"
                              checked={overwrite}
                              disabled={!selected}
                              onChange={(event) => {
                                const checked = event.currentTarget.checked
                                setBackupImport((current) => current ? {
                                  ...current,
                                  overwriteDomains: toggleDomain(current.overwriteDomains, domain, checked),
                                } : current)
                              }}
                            />
                            明确覆盖该域中身份相同的已有值
                          </label>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
              <button
                className="control-button control-button--primary"
                type="button"
                disabled={backupBusy || backupImport.selectedDomains.length === 0}
                onClick={confirmPersonalBackupImport}
              >
                确认导入所选数据域
              </button>
            </div>
          ) : null}
        </section>
      </div>

      <section className="settings-changelog" aria-labelledby="changelog-title">
        <div className="settings-changelog-heading">
          <div className="settings-card-heading">
            <p className="eyebrow">历史</p>
            <h2 id="changelog-title">更新日志</h2>
          </div>
          <p className="settings-current-version">
            当前版本 <strong>{buildInfo.version}</strong>
          </p>
        </div>
        {releaseGrouping.pendingVersions.length > 0 ? (
          <section className="settings-pending-releases" aria-labelledby="pending-releases-title">
            <div className="settings-release-section-heading">
              <p className="eyebrow">尚未进入下一个里程碑</p>
              <h3 id="pending-releases-title">开发中的小版本</h3>
            </div>
            <div className="settings-release-entry-list">
              {releaseGrouping.pendingVersions.map((release) => (
                <ReleaseEntry key={release.version} release={release} />
              ))}
            </div>
          </section>
        ) : null}
        <div className="settings-release-list">
          {releaseGrouping.milestoneGroups.map((group) => {
            const milestone = group.children.find(
              (release) => release.version === group.milestoneVersion,
            )
            if (!milestone) {
              return null
            }

            return (
              <details
                key={group.milestoneVersion}
                data-release-milestone
                data-release-highlighted={group.milestoneVersion === highlightedMilestoneVersion ? 'true' : undefined}
                className={group.milestoneVersion === highlightedMilestoneVersion ? 'settings-release-highlight' : undefined}
                open={group.milestoneVersion === highlightedMilestoneVersion}
              >
                <summary>
                  <span>{group.label}</span>
                  <span>{milestone.date}</span>
                  <strong>{milestone.title}</strong>
                </summary>
                <div className="settings-release-entry-list">
                  {group.children.map((release) => (
                    <ReleaseEntry key={release.version} release={release} />
                  ))}
                </div>
              </details>
            )
          })}
        </div>
      </section>
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
      storage.getItem(getTimingOverridesStorageKey(edition.songId)) !== null
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

function summarizeBackupDomains(preview: PersonalBackupImportPreview): Array<{
  domain: PersonalBackupDomain
  newCount: number
  conflicts: number
  unchanged: number
  skipped: number
}> {
  const domains = new Set<PersonalBackupDomain>([
    ...preview.candidates.map(({ domain }) => domain),
    ...(Object.keys(preview.skipped) as PersonalBackupDomain[]),
  ])
  return [...domains].map((domain) => {
    const candidates = preview.candidates.filter((candidate) => candidate.domain === domain)
    return {
      domain,
      newCount: candidates.filter(({ state }) => state === 'new').length,
      conflicts: candidates.filter(({ state }) => state === 'conflict').length,
      unchanged: candidates.filter(({ state }) => state === 'unchanged').length,
      skipped: preview.skipped[domain] ?? 0,
    }
  })
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

function backupDomainLabel(domain: PersonalBackupDomain): string {
  return domain === 'practice' ? '学唱进度'
    : domain === 'rates' ? '播放速度'
      : domain === 'lyricDisplayPreferences' ? '歌词显示偏好'
        : domain === 'resumeContext' ? '最近学习位置'
          : domain === 'practiceQueue' ? '待练队列'
            : 'Timing Debugger 微调'
}

function describeBackupError(error: unknown): string {
  return error instanceof Error ? error.message : '发生未知本地处理错误。'
}

function ReleaseEntry({ release }: { release: (typeof RELEASES)[number] | RemoteReleaseNote }) {
  return (
    <article className="settings-release-entry" data-release-entry>
      <header>
        <div>
          <h3>{release.version}</h3>
          <p>{release.date}</p>
        </div>
        <strong>{release.title}</strong>
      </header>
      <p>{release.summary}</p>
      <ul>
        {release.changes.map((change) => <li key={change}>{change}</li>)}
      </ul>
    </article>
  )
}

type OfflineStatus = 'available' | 'waiting' | 'unavailable'

function useOfflineStatus(): OfflineStatus {
  const [status, setStatus] = useState<OfflineStatus>(() => getOfflineStatus())

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }
    const updateStatus = (): void => setStatus(getOfflineStatus())
    navigator.serviceWorker.addEventListener('controllerchange', updateStatus)
    updateStatus()
    return () => navigator.serviceWorker.removeEventListener('controllerchange', updateStatus)
  }, [])

  return status
}

function getOfflineStatus(): OfflineStatus {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return 'unavailable'
  }
  return navigator.serviceWorker.controller ? 'available' : 'waiting'
}

function offlineStatusLabel(status: OfflineStatus): string {
  if (status === 'available') {
    return '可用'
  }
  if (status === 'waiting') {
    return '可用，等待接管'
  }
  return '开发环境不可用'
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString()
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
    if (stored.kind !== 'none') {
      clearTimingOverrides(identity)
    }
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
