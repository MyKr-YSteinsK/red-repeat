import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  RUNTIME_CONTRACT_VERSION,
  type Catalog,
  type CatalogEdition,
} from '../library/runtime-schema'
import {
  clearTimingOverrides,
  readTimingOverrides,
  type TimingOverrideIdentity,
} from '../practice/practice-timing-overrides'
import { buildInfo } from '../release/build-info'
import { RELEASES } from '../release/releases'
import { groupReleaseLedger } from '../release/release-grouping'
import type { RuntimeClient } from '../runtime/runtime-client'
import {
  describeUpdateStatus,
  getUpdateManager,
  type UpdateManager,
} from '../pwa/update-manager'
import { createTimingDebuggerHref } from '../navigation'
import {
  createTimingExportFilename,
  createTimingExportMarkdown,
  type TimingExportSong,
} from './timing-export'

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
  const currentUpdateManager = providedUpdateManager ?? getUpdateManager()
  const updateSnapshot = useSyncExternalStore(
    currentUpdateManager.subscribe,
    currentUpdateManager.getSnapshot,
    currentUpdateManager.getSnapshot,
  )
  const offlineStatus = useOfflineStatus()
  const [selection, setSelection] = useState<ExportSelection>('all')
  const [exportState, setExportState] = useState<ExportState>({ status: 'idle' })
  const catalog = catalogState.status === 'ready' ? catalogState.catalog : undefined
  const settingsLocation = window.location
  const timingDebuggerHref = createTimingDebuggerHref(undefined, settingsLocation)
  const releaseGrouping = groupReleaseLedger(RELEASES)
  const highlightedMilestoneVersion = highlightVersion
    ? releaseGrouping.milestoneGroups.find((group) =>
      group.children.some((release) => release.version === highlightVersion),
    )?.milestoneVersion ?? releaseGrouping.milestoneGroups[0]?.milestoneVersion
    : undefined

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
                type="button"
                onClick={() => void currentUpdateManager.checkForUpdate({ manual: true })}
                disabled={updateSnapshot.status === 'checking' || updateSnapshot.status === 'updating'}
              >
                {updateSnapshot.status === 'checking' ? '检查中…' : '检查更新'}
              </button>
              {updateSnapshot.status === 'update-available' || updateSnapshot.status === 'updating' ? (
                <button
                  type="button"
                  className="settings-update-primary"
                  onClick={() => void currentUpdateManager.applyUpdate()}
                  disabled={updateSnapshot.status === 'updating'}
                >
                  {updateSnapshot.status === 'updating' ? '更新中…' : '立即更新'}
                </button>
              ) : null}
            </div>
            <p className="settings-update-status" role="status" aria-live="polite">
              {describeUpdateStatus(updateSnapshot)}
            </p>
            {updateSnapshot.status === 'error' && updateSnapshot.error ? (
              <p className="settings-update-error">{updateSnapshot.error}</p>
            ) : null}
          </section>
        </section>

        <section className="settings-card settings-card-action" aria-labelledby="timing-settings-title">
          <div className="settings-card-heading">
            <p className="eyebrow">内容作业</p>
            <h2 id="timing-settings-title">播放切口调试</h2>
          </div>
          <p>逐句校准 playStartMs / playEndMs。微调只保存在本机，学唱、全曲和讲解会即时共同消费。</p>
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
              <button type="button" onClick={() => void handleExport()} disabled={exportState.status === 'loading'}>
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

function ReleaseEntry({ release }: { release: (typeof RELEASES)[number] }) {
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
