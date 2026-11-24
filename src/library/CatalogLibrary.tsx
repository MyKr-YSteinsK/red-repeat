import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { createContinueHref } from '../navigation'
import { PracticeQueuePanel } from '../practice/PracticeQueuePanel'
import { readPracticeResumeMetadata } from '../practice/practice-state'
import { readResumeContext } from '../practice/resume-context'
import { readSongDownloadState, type SongDownloadState } from '../pwa/song-download'
import type { SongDownloadTaskManager, SongDownloadTaskSnapshot } from '../pwa/song-download-tasks'
import type { RuntimeClient } from '../runtime/runtime-client'
import { CatalogEditionCard } from './CatalogEditionCard'
import { getInstalledSnapshotEdition, matchesCatalogSearch } from './catalog-search'
import type { Catalog, CatalogEdition } from './runtime-schema'

const pageScrollKeys = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])

export interface CatalogViewportState {
  hasPosition: boolean
  scrollY: number
  anchorSongId?: string
  anchorTop?: number
}

export function CatalogLibrary({
  catalog,
  runtimeClient,
  downloadTasks,
  query,
  onQueryChange,
  offlineOnly,
  onOfflineOnlyChange,
  viewportRef,
}: {
  catalog: Catalog
  runtimeClient: RuntimeClient
  downloadTasks: SongDownloadTaskManager
  query: string
  onQueryChange: (query: string) => void
  offlineOnly: boolean
  onOfflineOnlyChange: (offlineOnly: boolean) => void
  viewportRef: { current: CatalogViewportState }
}) {
  const [downloadBySongId, setDownloadBySongId] = useState<
    Readonly<Record<string, SongDownloadState>>
  >({})
  const subscribeToTasks = useCallback(
    (listener: () => void) => downloadTasks.subscribe(listener),
    [downloadTasks],
  )
  const readTaskSnapshot = useCallback(
    () => downloadTasks.getTasksSnapshot(),
    [downloadTasks],
  )
  const taskBySongId = useSyncExternalStore(
    subscribeToTasks,
    readTaskSnapshot,
    readTaskSnapshot,
  )
  const appliedTaskResultsRef = useRef(
    new Map<string, SongDownloadTaskSnapshot>(),
  )
  const [removingSongIds, setRemovingSongIds] = useState<ReadonlySet<string>>(
    new Set(),
  )
  const searchRef = useRef<HTMLInputElement>(null)
  const pendingReturn = useRef<CatalogViewportState | null>(null)
  const [openSongId, setOpenSongId] = useState<string | null>(null)
  const [downloadStateCheckComplete, setDownloadStateCheckComplete] =
    useState(false)
  const downloadStateStorageUnavailable = typeof caches === 'undefined'

  const cancelPendingReturn = useCallback(() => {
    if (!pendingReturn.current) return
    pendingReturn.current = null
    viewportRef.current = { hasPosition: false, scrollY: 0 }
  }, [viewportRef])

  useEffect(() => {
    const completed = Object.values(taskBySongId).flatMap((task) => {
      if (
        task.kind !== 'download' ||
        task.status === 'running' ||
        appliedTaskResultsRef.current.get(task.songId) === task
      ) {
        return []
      }
      return [task]
    })
    if (completed.length === 0) {
      return
    }
    for (const task of completed) {
      appliedTaskResultsRef.current.set(task.songId, task)
    }
    setDownloadBySongId((current) => ({
      ...current,
      ...Object.fromEntries(
        completed.map((task) => [task.songId, task.resultState]),
      ),
    }))
  }, [taskBySongId])

  useLayoutEffect(() => {
    pendingReturn.current = viewportRef.current.hasPosition ? { ...viewportRef.current } : null
  }, [viewportRef])

  useLayoutEffect(() => {
    const saved = pendingReturn.current
    if (!saved || (offlineOnly && !downloadStateStorageUnavailable && !downloadStateCheckComplete)) {
      return
    }

    const anchor = saved.anchorSongId
      ? [...document.querySelectorAll<HTMLElement>('.catalog-entry[data-song-id]')]
          .find((entry) => entry.dataset.songId === saved.anchorSongId)
      : undefined
    pendingReturn.current = null
    const anchorOffset = saved.anchorTop ?? 0
    const targetScrollY = anchor
      ? window.scrollY + anchor.getBoundingClientRect().top - anchorOffset
      : saved.scrollY
    const nextScrollY = Math.max(0, targetScrollY)
    if (Math.abs(nextScrollY - window.scrollY) > 1) {
      window.scrollTo({ top: nextScrollY, behavior: 'auto' })
    }
  }, [downloadStateCheckComplete, downloadStateStorageUnavailable, offlineOnly])

  useEffect(() => {
    const captureViewport = (): void => captureCatalogViewport(viewportRef)
    // Route changes can clamp the viewport and emit scroll while the list is still loading.
    const onWheel = (event: WheelEvent): void => {
      if (event.deltaY && !event.ctrlKey && !event.defaultPrevented) cancelPendingReturn()
    }
    const onTouchMove = (event: TouchEvent): void => {
      if (event.touches.length === 1 && !event.defaultPrevented) cancelPendingReturn()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!pageScrollKeys.has(event.key) || event.defaultPrevented ||
          event.ctrlKey || event.altKey || event.metaKey) return
      const target = event.target
      if (target instanceof HTMLElement && (
        target.isContentEditable || target.closest('input, textarea, select') ||
        (event.key === ' ' && target.closest('button, summary'))
      )) return
      cancelPendingReturn()
    }

    window.addEventListener('scroll', captureViewport, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('scroll', captureViewport)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [cancelPendingReturn, viewportRef])

  useEffect(() => {
    let active = true

    if (typeof caches === 'undefined') {
      return () => {
        active = false
      }
    }

    void Promise.all(
      catalog.editions.map(
        async (edition): Promise<readonly [string, SongDownloadState]> => {
          try {
            const state = await readSongDownloadState(edition.songId)
            if (
              state.songId !== edition.songId ||
              (state.status === 'installed' &&
                !getInstalledSnapshotEdition(edition.songId, state))
            ) {
              return [
                edition.songId,
                {
                  songId: edition.songId,
                  status: 'failed' as const,
                  errorMessage: '本机下载身份无法确认。',
                },
              ] as const
            }
            return [edition.songId, state] as const
          } catch {
            return [
              edition.songId,
              {
                songId: edition.songId,
                status: 'failed' as const,
                errorMessage: '无法确认本机离线状态。',
              },
            ] as const
          }
        },
      ),
    ).then((entries) => {
      if (!active) {
        return
      }
      const initialStates = Object.fromEntries(entries) as Record<
        string,
        SongDownloadState
      >
      for (const task of Object.values(downloadTasks.getTasksSnapshot())) {
        if (task.kind === 'download' && task.status !== 'running') {
          initialStates[task.songId] = task.resultState
        }
      }
      setDownloadBySongId(initialStates)
      setDownloadStateCheckComplete(true)

      entries.forEach(([songId, state]) => {
        const currentEdition = catalog.editions.find(
          (edition) => edition.songId === songId,
        )
        if (
          !getInstalledSnapshotEdition(songId, state) ||
          !currentEdition ||
          state.editionUrl === currentEdition.editionUrl
        ) {
          return
        }

        const refresh = downloadTasks.start(
          currentEdition,
          runtimeClient,
          'catalog-refresh',
        )
        if (refresh.outcome === 'already-completed') {
          void refresh.completion.then((refreshedState) => {
            if (active) {
              setDownloadBySongId((current) => ({
                ...current,
                [songId]: refreshedState,
              }))
            }
          })
        }
      })
    })

    return () => {
      active = false
    }
  }, [catalog, downloadTasks, runtimeClient])

  const changeQuery = (value: string): void => {
    cancelPendingReturn()
    onQueryChange(value)
  }

  const captureBeforeNavigation = (): void => {
    pendingReturn.current = null
    captureCatalogViewport(viewportRef)
  }

  const handleDownload = (edition: CatalogEdition): void => {
    downloadTasks.start(edition, runtimeClient, 'manual')
  }

  const handleCancelDownload = (songId: string): void => {
    downloadTasks.cancel(songId)
  }

  const handleRemove = async (edition: CatalogEdition): Promise<void> => {
    setRemovingSongIds((current) => new Set(current).add(edition.songId))
    try {
      await downloadTasks.remove(edition.songId)
      setDownloadBySongId((current) => ({
        ...current,
        [edition.songId]: {
          songId: edition.songId,
          status: 'not-installed',
        },
      }))
    } catch {
      setDownloadBySongId((current) => ({
        ...current,
        [edition.songId]: {
          songId: edition.songId,
          status: 'failed',
          errorMessage: '移除失败，请稍后重试。',
        },
      }))
    } finally {
      setOpenSongId(null)
      setRemovingSongIds((current) => {
        const next = new Set(current)
        next.delete(edition.songId)
        return next
      })
    }
  }

  const filteredEditions = catalog.editions.flatMap((catalogEdition) => {
    const task = taskBySongId[catalogEdition.songId]
    const taskResult = task?.kind === 'download' && task.status !== 'running'
      ? task.resultState
      : undefined
    const download = taskResult ?? downloadBySongId[catalogEdition.songId]
    const snapshotEdition = downloadStateStorageUnavailable
      ? undefined
      : getInstalledSnapshotEdition(catalogEdition.songId, download)
    const displayEdition = offlineOnly
      ? snapshotEdition
      : catalogEdition

    if (
      !displayEdition ||
      !matchesCatalogSearch(displayEdition, query)
    ) {
      return []
    }

    return [{ catalogEdition, displayEdition, download, task }]
  })
  const hasUnverifiedOfflineState = Object.values(downloadBySongId).some(
    (download) => download.status === 'failed' || download.status === 'installing',
  ) || downloadStateStorageUnavailable
  const savedResumeContext = readResumeContext()
  const savedResumeEdition = savedResumeContext
    ? catalog.editions.find(({ songId }) => songId === savedResumeContext.songId)
    : undefined
  const legacyPracticeResume = savedResumeEdition
    ? undefined
    : catalog.editions
      .map((edition) => ({ edition, metadata: readPracticeResumeMetadata(edition.songId) }))
      .filter((entry) => entry.metadata?.updatedAt !== undefined)
      .sort((left, right) => (right.metadata?.updatedAt ?? 0) - (left.metadata?.updatedAt ?? 0))[0]
  const lastContext = savedResumeEdition && savedResumeContext
    ? savedResumeContext
    : legacyPracticeResume?.metadata
      ? {
          songId: legacyPracticeResume.edition.songId,
          mode: 'practice' as const,
          occurrenceId: legacyPracticeResume.metadata.occurrenceId,
          practiceUnitId: legacyPracticeResume.metadata.practiceUnitId,
        }
      : undefined
  const lastEdition = savedResumeEdition ?? legacyPracticeResume?.edition

  return (
    <main className="library library-populated" aria-labelledby="library-title">
      <header className="library-heading" data-searching={Boolean(query.trim())}>
        <div className="collection-jacket">
          <div>
            <h1 id="library-title">曲库</h1>
            <p>{catalog.editions.length} 首歌曲</p>
          </div>
          <div className="collection-sleeves" aria-hidden="true">
            {catalog.editions.slice(0, 3).map((edition) => (
              <img key={edition.songId} alt="" src={runtimeClient.resolveAsset(edition.coverUrl)} />
            ))}
          </div>
        </div>
        <form className="library-search" role="search" onSubmit={(event) => {
          event.preventDefault()
          searchRef.current?.blur()
        }}>
          <span className="search-lens" aria-hidden="true" />
          <input
            ref={searchRef}
            aria-label="搜索歌曲、歌手、专辑或罗马字"
            type="search"
            enterKeyHint="search"
            value={query}
            placeholder="搜索歌曲、歌手、专辑或罗马字"
            onChange={(event) => changeQuery(event.currentTarget.value)}
          />
          {query && <button type="button" aria-label="清除搜索" onClick={() => {
            changeQuery('')
            searchRef.current?.focus()
          }}>×</button>}
        </form>
      </header>

      <CatalogSection
        title={query.trim() ? '搜索结果' : offlineOnly ? '离线可用歌曲' : '全部歌曲'}
        filter={<label className="catalog-offline-filter">
          <input type="checkbox" checked={offlineOnly}
            onChange={(event) => {
              cancelPendingReturn()
              onOfflineOnlyChange(event.currentTarget.checked)
            }} />
          <span>仅显示离线可用</span>
        </label>}
        onClick={(event) => {
          const target = event.target
          if (
            target instanceof Element &&
            target.closest('[data-swipe-open="true"] .catalog-entry-surface')
          ) {
            return
          }
          setOpenSongId(null)
        }}
      >
        {offlineOnly &&
        downloadStateCheckComplete &&
        filteredEditions.length > 0 &&
        hasUnverifiedOfflineState ? (
          <p className="catalog-offline-note" role="status">
            部分歌曲的离线状态无法确认。
          </p>
        ) : null}
        {filteredEditions.length > 0 ? (
          filteredEditions.map(({ catalogEdition, displayEdition, download, task }) => {
            const isRemoving = removingSongIds.has(catalogEdition.songId) ||
              (task?.kind === 'remove' && task.status === 'running')
            return (
              <CatalogEditionCard
                key={catalogEdition.songId}
                edition={displayEdition}
                downloadEdition={catalogEdition}
                runtimeClient={runtimeClient}
                download={
                  download ?? {
                    songId: catalogEdition.songId,
                    status: 'not-installed',
                  }
                }
                task={task}
                isRemoving={isRemoving}
                isDownloadAvailable={!downloadStateStorageUnavailable}
                onDownload={handleDownload}
                onCancelDownload={handleCancelDownload}
                onRemove={handleRemove}
                onBeforeNavigate={captureBeforeNavigation}
                isSwipeOpen={openSongId === catalogEdition.songId}
                onSwipeOpen={() => setOpenSongId(catalogEdition.songId)}
                onSwipeClose={() => setOpenSongId(null)}
              />
            )
          })
        ) : (
          <div className="catalog-no-results" role="status">
            {offlineOnly ? (
              !downloadStateCheckComplete &&
              !downloadStateStorageUnavailable ? (
                <>
                  <strong>正在核验离线状态</strong>
                  <span>请稍候，正在检查本机完整歌曲快照。</span>
                </>
              ) : hasUnverifiedOfflineState ? (
                <>
                  <strong>无法确认离线状态</strong>
                  <span>本机下载记录暂时无法核验，请稍后重试。</span>
                </>
              ) : (
                <>
                  <strong>没有符合条件的离线歌曲</strong>
                  <span>当前搜索条件下没有已核验的完整离线快照。</span>
                </>
              )
            ) : (
              <>
                <strong>没有找到歌曲</strong>
                <span>试试其他歌曲名、歌手或专辑。</span>
              </>
            )}
          </div>
        )}
      </CatalogSection>
      {lastContext && lastEdition ? (
        <section className="catalog-continue" aria-label="继续上次学习">
          <div>
            <p className="eyebrow">最近学习</p>
            <h2>继续上次：{lastEdition.title}</h2>
            <p>{resumeModeLabel(lastContext.mode)} · {lastContext.occurrenceId ?? '恢复到安全位置'}</p>
          </div>
          <a
            className="catalog-continue-link"
            href={createContinueHref(lastContext.songId, window.location)}
            onClick={captureBeforeNavigation}
          >
            继续上次 →
          </a>
        </section>
      ) : null}

      <PracticeQueuePanel
        catalog={catalog}
        runtimeClient={runtimeClient}
        onBeforeNavigate={captureBeforeNavigation}
      />
    </main>
  )
}

function resumeModeLabel(mode: 'practice' | 'all' | 'explain'): string {
  return mode === 'practice' ? '学唱' : mode === 'all' ? '全曲' : '讲解'
}

function CatalogSection({
  title,
  filter,
  children,
  onClick,
}: {
  title: string
  filter: ReactNode
  children: ReactNode
  onClick?: (event: ReactMouseEvent<HTMLDivElement>) => void
}) {
  return (
    <section className="catalog-section">
      <div className="catalog-section-heading"><h2>{title}</h2>{filter}</div>
      <div className="catalog-list" aria-label={title} onClick={onClick}>
        {children}
      </div>
    </section>
  )
}

function captureCatalogViewport(
  viewportRef: { current: CatalogViewportState },
): void {
  const visibleEntry = [
    ...document.querySelectorAll<HTMLElement>('.catalog-entry[data-song-id]'),
  ].find((entry) => {
    const rect = entry.getBoundingClientRect()
    return rect.bottom > 0 && rect.top < window.innerHeight
  })
  viewportRef.current = {
    hasPosition: true,
    scrollY: window.scrollY,
    ...(visibleEntry?.dataset.songId
      ? {
          anchorSongId: visibleEntry.dataset.songId,
          anchorTop: visibleEntry.getBoundingClientRect().top,
        }
      : {}),
  }
}
