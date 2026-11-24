import { createEditionHref } from '../navigation'
import type { SongDownloadState } from '../pwa/song-download'
import type { SongDownloadTaskSnapshot } from '../pwa/song-download-tasks'
import type { RuntimeClient } from '../runtime/runtime-client'
import type { CatalogEdition } from './runtime-schema'
import { useSwipeReveal } from './use-swipe-reveal'

export function CatalogEditionCard({
  edition,
  downloadEdition,
  runtimeClient,
  download,
  task,
  isRemoving,
  isDownloadAvailable,
  onDownload,
  onCancelDownload,
  onRemove,
  onBeforeNavigate,
  isSwipeOpen,
  onSwipeOpen,
  onSwipeClose,
}: {
  edition: CatalogEdition
  downloadEdition: CatalogEdition
  runtimeClient: RuntimeClient
  download: SongDownloadState
  task?: SongDownloadTaskSnapshot
  isRemoving: boolean
  isDownloadAvailable: boolean
  onDownload: (edition: CatalogEdition) => void
  onCancelDownload: (songId: string) => void
  onRemove: (edition: CatalogEdition) => void
  onBeforeNavigate: () => void
  isSwipeOpen: boolean
  onSwipeOpen: () => void
  onSwipeClose: () => void
}) {
  const isInstalled = download.status === 'installed'
  const coverUrl =
    isInstalled && download.snapshotEdition
      ? download.snapshotEdition.coverUrl
      : edition.coverUrl
  const swipe = useSwipeReveal({
    enabled: isInstalled,
    open: isSwipeOpen,
    onOpen: onSwipeOpen,
    onClose: onSwipeClose,
  })

  return (
    <article
      className="catalog-entry"
      data-song-id={edition.songId}
      data-swipe-open={isSwipeOpen ? 'true' : undefined}
    >
      <div className="catalog-entry-swipe">
        <div className="catalog-delete-tray">
          {isInstalled ? (
            <button
              className="catalog-delete-button"
              type="button"
              disabled={isRemoving}
              aria-label={`${isRemoving ? '移除中…' : '删除'} ${edition.title}`}
              onFocus={onSwipeOpen}
              onClick={() => onRemove(edition)}
            >
              {isRemoving ? '移除中…' : '删除'}
            </button>
          ) : null}
        </div>
        <div
          className="catalog-entry-surface"
          {...swipe}
        >
          <div className="catalog-entry-main">
            <a
              className="catalog-entry-link"
              href={createEditionHref(edition.songId, window.location)}
              aria-label={`打开 ${edition.title}`}
              onClick={onBeforeNavigate}
            >
              <img
                className="catalog-cover"
                src={runtimeClient.resolveAsset(coverUrl)}
                alt=""
                loading="lazy"
              />
              <span className="catalog-copy">
                <span className="catalog-title">{edition.title}</span>
                <span className="catalog-artist">{edition.artist}</span>
                {edition.album || edition.year !== undefined ? (
                  <span className="catalog-meta">
                    {edition.album ?? ''}
                    {edition.album && edition.year !== undefined ? ' / ' : ''}
                    {edition.year ?? ''}
                  </span>
                ) : null}
              </span>
            </a>
            <CatalogDownloadSlot
              edition={edition}
              downloadEdition={downloadEdition}
              download={download}
              task={task}
              isRemoving={isRemoving}
              isDownloadAvailable={isDownloadAvailable}
              onDownload={onDownload}
              onCancelDownload={onCancelDownload}
            />
          </div>
        </div>
      </div>
    </article>
  )
}

function CatalogDownloadSlot({
  edition,
  downloadEdition,
  download,
  task,
  isRemoving,
  isDownloadAvailable,
  onDownload,
  onCancelDownload,
}: {
  edition: CatalogEdition
  downloadEdition: CatalogEdition
  download: SongDownloadState
  task?: SongDownloadTaskSnapshot
  isRemoving: boolean
  isDownloadAvailable: boolean
  onDownload: (edition: CatalogEdition) => void
  onCancelDownload: (songId: string) => void
}) {
  const runningDownload = task?.kind === 'download' && task.status === 'running'
    ? task
    : undefined
  const isRemovingTask = task?.kind === 'remove' && task.status === 'running'
  const taskResult = task?.kind === 'download' && task.status !== 'running'
    ? task.resultState
    : undefined
  const currentDownload = taskResult ?? download
  const isInstalled = currentDownload.status === 'installed'
  const label = currentDownload.status === 'failed' ||
    (task?.kind === 'download' && task.status === 'failed')
    ? '重试'
    : '下载'
  const progressMessage = runningDownload
    ? downloadProgressMessage(runningDownload)
    : undefined
  const taskMessage = task?.kind === 'download' && task.status !== 'running'
    ? task.status === 'cancelled'
      ? task.resultState.status === 'installed'
        ? '已取消更新，原离线版本仍可用。'
        : '下载已取消。'
      : task.status === 'failed'
        ? task.message ?? '下载失败，请检查网络后重试。'
        : undefined
    : undefined
  const canRetryUpdate = Boolean(
    task?.kind === 'download' &&
      (task.status === 'cancelled' || task.status === 'failed') &&
      task.resultState.status === 'installed' &&
      task.resultState.editionUrl !== task.editionUrl,
  )
  const announcement = isRemovingTask || isRemoving
    ? '正在移除离线歌曲'
    : runningDownload
      ? downloadProgressAnnouncement(runningDownload.phase)
      : taskMessage ?? currentDownload.errorMessage ?? ''

  return (
    <div className="catalog-download-slot">
      {runningDownload ? (
        <>
          <span className="catalog-download-state" aria-live="off">
            {isInstalled ? `已下载 · ${progressMessage}` : progressMessage}
          </span>
          {runningDownload.totalResources !== undefined ? (
            <progress
              className="catalog-download-progress"
              aria-label={`下载 ${edition.title} 的资源核验进度`}
              value={runningDownload.completedResources}
              max={runningDownload.totalResources}
            />
          ) : (
            <progress
              className="catalog-download-progress"
              aria-label={`正在准备 ${edition.title} 的下载资源`}
            />
          )}
          <button
            className="catalog-download-button"
            type="button"
            aria-label={`取消下载 ${edition.title}`}
            onClick={(event) => {
              event.stopPropagation()
              onCancelDownload(edition.songId)
            }}
          >
            取消
          </button>
        </>
      ) : isRemovingTask || isRemoving ? (
        <span className="catalog-download-state">正在移除…</span>
      ) : isInstalled ? (
        <>
          <span
            className="catalog-download-state"
            aria-label={`已下载 ${edition.title}`}
          >
            已下载
          </span>
          {canRetryUpdate ? (
            <button
              className="catalog-download-button"
              type="button"
              aria-label={`${task?.status === 'failed' ? '重试更新' : '下载更新'} ${downloadEdition.title}`}
              onClick={(event) => {
                event.stopPropagation()
                onDownload(downloadEdition)
              }}
            >
              {task?.status === 'failed' ? '重试更新' : '下载更新'}
            </button>
          ) : null}
        </>
      ) : isDownloadAvailable ? (
        <button
          className="catalog-download-button"
          type="button"
          disabled={isRemoving}
          aria-label={`${label} ${edition.title}`}
          onClick={(event) => {
            event.stopPropagation()
            onDownload(downloadEdition)
          }}
        >
          {label}
        </button>
      ) : (
        <span className="catalog-download-state" aria-label="当前环境不支持离线下载">
          离线下载不可用
        </span>
      )}
      {taskMessage || currentDownload.errorMessage ? (
        <span className="catalog-download-error">
          {taskMessage ?? currentDownload.errorMessage}
        </span>
      ) : null}
      {announcement ? (
        <span
          className="catalog-download-announcement"
          aria-live="polite"
          aria-atomic="true"
        >
          {announcement}
        </span>
      ) : null}
    </div>
  )
}

function downloadProgressMessage(
  task: Extract<SongDownloadTaskSnapshot, { kind: 'download' }>,
): string {
  if (task.phase === 'preparing') {
    return '正在准备资源…'
  }
  if (task.phase === 'downloading' && task.totalResources !== undefined) {
    return `已核验 ${task.completedResources}/${task.totalResources} 项`
  }
  return task.phase === 'verifying'
    ? '正在校验完整快照…'
    : '正在完成离线快照…'
}

function downloadProgressAnnouncement(
  phase: Extract<SongDownloadTaskSnapshot, { kind: 'download' }>['phase'],
): string {
  return phase === 'preparing'
    ? '正在准备下载资源'
    : phase === 'downloading'
      ? '正在核验并下载资源'
      : phase === 'verifying'
        ? '正在校验完整离线快照'
        : '正在提交完整离线快照'
}
