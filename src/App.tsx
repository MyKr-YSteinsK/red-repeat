import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import './App.css'
import type { Catalog, CatalogEdition } from './library/runtime-schema'
import {
  getInstalledSnapshotEdition,
  matchesCatalogSearch,
} from './library/catalog-search'
import {
  createEditionHref,
  createLibraryHref,
  createContinueHref,
  createSettingsHref,
  parseAppRoute,
  type AppRoute,
} from './navigation'
import {
  createRuntimeClient,
  RuntimeClient,
  RuntimeClientError,
} from './runtime/runtime-client'
import { SongEditionPage } from './edition/SongEditionPage'
import type { PreparedSongEditionLoad } from './edition/use-song-edition-core'
import { hasWarmSongEditionCore, loadRuntimeSongEditionCore } from './runtime/song-edition-loader'
import { useSwipeReveal } from './library/use-swipe-reveal'
import { PracticeQueuePanel } from './practice/PracticeQueuePanel'
import { readResumeContext } from './practice/resume-context'
import { readPracticeResumeMetadata } from './practice/practice-state'
import {
  getUpdateManager,
  type UpdateManager,
} from './pwa/update-manager'
import {
  downloadSongRuntime,
  readSongDownloadState,
  removeSongRuntime,
  type SongDownloadState,
} from './pwa/song-download'

const DevTimelineDebuggerPage = import.meta.env.DEV
  ? lazy(async () => {
      const module = await import('./debugger/TimelineDebuggerPage')
      return { default: module.TimelineDebuggerPage }
    })
  : undefined

const loadSettingsPage = () =>
  import('./settings/SettingsPage').then(({ SettingsPage }) => SettingsPage)
const loadTimingDebuggerPage = () =>
  import('./debugger/TimingDebuggerPage').then(({ TimingDebuggerPage }) => TimingDebuggerPage)

if (import.meta.env.DEV) {
  void import('./debugger/TimelineDebugger.css')
}

const defaultRuntimeClient = createRuntimeClient()

interface AppProps {
  runtimeClient?: RuntimeClient
  updateManager?: UpdateManager
}

type CatalogState =
  | { status: 'loading' }
  | { status: 'ready'; catalog: Catalog }
  | { status: 'error'; error: unknown }

interface CatalogViewportState {
  hasPosition: boolean
  scrollY: number
  anchorSongId?: string
  anchorTop?: number
}

function App({
  runtimeClient = defaultRuntimeClient,
  updateManager: providedUpdateManager,
}: AppProps) {
  const currentUpdateManager = providedUpdateManager ?? getUpdateManager()
  const [route, setRoute] = useState<AppRoute>(() =>
    parseAppRoute(window.location),
  )
  const [retryKey, setRetryKey] = useState(0)
  const [catalogState, setCatalogState] = useState<CatalogState>({
    status: 'loading',
  })
  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogOfflineOnly, setCatalogOfflineOnly] = useState(false)
  const [preparedEntry, setPreparedEntry] = useState<PreparedSongEditionLoad>()
  const handledHrefRef = useRef(window.location.href)
  const catalogViewportRef = useRef<CatalogViewportState>({
    hasPosition: false,
    scrollY: 0,
  })

  useEffect(() => {
    let active = true
    let controller: AbortController | undefined
    const updateRoute = (): void => {
      const href = window.location.href
      if (handledHrefRef.current === href) return
      handledHrefRef.current = href
      controller?.abort()
      const nextRoute = parseAppRoute(window.location)
      const edition = nextRoute.kind === 'edition' && catalogState.status === 'ready'
        ? catalogState.catalog.editions.find(candidate => candidate.songId === nextRoute.songId)
        : undefined

      if (route.kind === 'library' && edition && hasWarmSongEditionCore(runtimeClient, edition.songId)) {
        // Keep the mounted Catalog while checking the manifest. Only this
        // entry's resolved result may seed the destination's first render.
        const requestController = new AbortController()
        controller = requestController
        const finish = (state: PreparedSongEditionLoad['state']): void => {
          if (!active || requestController.signal.aborted || window.location.href !== href) return
          setPreparedEntry({ songId: edition.songId, editionUrl: edition.editionUrl, state })
          setRoute(nextRoute)
        }
        void loadRuntimeSongEditionCore(runtimeClient, edition, { signal: requestController.signal })
          .then(core => finish({ status: 'ready', core }))
          .catch((error: unknown) => {
            if (!(error instanceof RuntimeClientError && error.kind === 'abort')) {
              finish({ status: 'error', error })
            }
          })
        return
      }

      setPreparedEntry(undefined)
      setRoute(nextRoute)
    }
    window.addEventListener('hashchange', updateRoute)
    window.addEventListener('popstate', updateRoute)
    return () => {
      active = false
      controller?.abort()
      window.removeEventListener('hashchange', updateRoute)
      window.removeEventListener('popstate', updateRoute)
    }
  }, [catalogState, route, runtimeClient])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    void runtimeClient
      .loadCatalog({ signal: controller.signal })
      .then((catalog) => {
        if (active) {
          setCatalogState({ status: 'ready', catalog })
        }
      })
      .catch((error: unknown) => {
        if (
          active &&
          !(error instanceof RuntimeClientError && error.kind === 'abort')
        ) {
          setCatalogState({ status: 'error', error })
        }
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [retryKey, runtimeClient])

  const homeHref = createLibraryHref(window.location)
  const settingsHref = createSettingsHref(window.location)
  const retryCatalog = (): void => {
    setCatalogState({ status: 'loading' })
    setRetryKey((value) => value + 1)
  }

  return (
    <div className="app-shell">
      <SiteHeader homeHref={homeHref} settingsHref={settingsHref} />
      {route.kind === 'library' ? (
        <LibraryRoute
          state={catalogState}
          runtimeClient={runtimeClient}
          onRetry={retryCatalog}
          query={catalogQuery}
          onQueryChange={setCatalogQuery}
          offlineOnly={catalogOfflineOnly}
          onOfflineOnlyChange={setCatalogOfflineOnly}
          viewportRef={catalogViewportRef}
        />
      ) : route.kind === 'settings' ? (
        <AsyncRoutePage
          key="settings"
          load={loadSettingsPage}
          pageName="设置"
          homeHref={homeHref}
          pageProps={{
            catalogState,
            runtimeClient,
            homeHref,
            onRetryCatalog: retryCatalog,
            updateManager: currentUpdateManager,
            highlightVersion: route.releaseVersion,
          }}
        />
      ) : route.kind === 'timing-debugger' ? (
        <AsyncRoutePage
          key="timing-debugger"
          load={loadTimingDebuggerPage}
          pageName="Timing Debugger"
          homeHref={homeHref}
          pageProps={{
            songId: route.songId,
            catalogState,
            runtimeClient,
            homeHref,
            onRetryCatalog: retryCatalog,
          }}
        />
      ) : route.kind === 'timeline-debugger' &&
        import.meta.env.DEV &&
        DevTimelineDebuggerPage ? (
        <Suspense
          fallback={
            <main className="library library-status" aria-labelledby="debugger-loading-title">
              <h1 id="debugger-loading-title">Loading Timeline Debugger.</h1>
            </main>
          }
        >
          <DevTimelineDebuggerPage
            songId={route.songId}
            catalogState={catalogState}
            runtimeClient={runtimeClient}
            homeHref={homeHref}
            onRetryCatalog={retryCatalog}
          />
        </Suspense>
      ) : route.kind === 'timeline-debugger' ? (
        <LibraryRoute
          state={catalogState}
          runtimeClient={runtimeClient}
          onRetry={retryCatalog}
          query={catalogQuery}
          onQueryChange={setCatalogQuery}
          offlineOnly={catalogOfflineOnly}
          onOfflineOnlyChange={setCatalogOfflineOnly}
          viewportRef={catalogViewportRef}
        />
      ) : (
        <EditionRoute
          route={route}
          state={catalogState}
          runtimeClient={runtimeClient}
          homeHref={homeHref}
          onRetry={retryCatalog}
          preparedLoad={preparedEntry}
        />
      )}
      <SiteFooter editionCount={getEditionCount(catalogState)} />
    </div>
  )
}

function SiteHeader({ homeHref, settingsHref }: { homeHref: string; settingsHref: string }) {
  return (
    <header className="site-header">
      <a className="brand-lockup" href={homeHref} aria-label="返回曲库">
        <span className="brand-signal" aria-hidden="true" />
        <span className="brand-wordmark">
          <span>RED</span>
          <span className="brand-divider" aria-hidden="true">
            :
          </span>
          <span>REPEAT</span>
        </span>
      </a>
      <div className="site-header-actions">
        <p className="imprint">Curated by MyKr</p>
        <a className="site-settings-link" href={settingsHref}>设置</a>
      </div>
    </header>
  )
}

function LibraryRoute({
  state,
  runtimeClient,
  onRetry,
  query,
  onQueryChange,
  offlineOnly,
  onOfflineOnlyChange,
  viewportRef,
}: {
  state: CatalogState
  runtimeClient: RuntimeClient
  onRetry: () => void
  query: string
  onQueryChange: (query: string) => void
  offlineOnly: boolean
  onOfflineOnlyChange: (offlineOnly: boolean) => void
  viewportRef: { current: CatalogViewportState }
}) {
  if (state.status === 'loading') {
    return (
      <main className="library library-status" aria-labelledby="library-title">
        <div className="library-heading">
          <p className="eyebrow">曲库</p>
          <h1 id="library-title">正在打开曲库…</h1>
          <p className="library-lede">正在读取歌曲列表。</p>
        </div>
        <p className="status-line" role="status">
          正在加载…
        </p>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="library library-status" aria-labelledby="library-title">
        <div className="library-heading">
          <p className="eyebrow">曲库</p>
          <h1 id="library-title">曲库暂时无法打开</h1>
          <p className="library-lede">暂时无法读取歌曲列表，请稍后重试。</p>
        </div>
        <section className="error-state" role="alert" aria-label="曲库错误">
          <p className="empty-kicker">可恢复错误</p>
          <p>{describeRuntimeError(state.error)}</p>
          <button type="button" className="text-button" onClick={onRetry}>
            重试
          </button>
        </section>
      </main>
    )
  }

  const { catalog } = state
  if (catalog.editions.length === 0) {
    return <EmptyLibrary />
  }

  return (
    <CatalogLibrary
      key={catalog.contentHash}
      catalog={catalog}
      runtimeClient={runtimeClient}
      query={query}
      onQueryChange={onQueryChange}
      offlineOnly={offlineOnly}
      onOfflineOnlyChange={onOfflineOnlyChange}
      viewportRef={viewportRef}
    />
  )
}

function EmptyLibrary() {
  return (
    <main className="library" aria-labelledby="library-title">
      <div className="library-heading">
        <p className="eyebrow">曲库</p>
        <h1 id="library-title">还没有歌曲</h1>
        <p className="library-lede">添加歌曲后，它们会显示在这里。</p>
      </div>

      <section className="empty-state" aria-labelledby="empty-state-title">
        <p className="empty-index" aria-hidden="true">
          00
        </p>
        <div className="empty-copy">
          <p className="empty-kicker">曲库状态</p>
          <h2 id="empty-state-title">从一首值得反复学唱的歌开始。</h2>
          <p>你的第一首歌会出现在这里。</p>
        </div>
        <p className="empty-signal" aria-label="曲库状态：空">
          00 / 00
        </p>
      </section>
    </main>
  )
}

function CatalogLibrary({
  catalog,
  runtimeClient,
  query,
  onQueryChange,
  offlineOnly,
  onOfflineOnlyChange,
  viewportRef,
}: {
  catalog: Catalog
  runtimeClient: RuntimeClient
  query: string
  onQueryChange: (query: string) => void
  offlineOnly: boolean
  onOfflineOnlyChange: (offlineOnly: boolean) => void
  viewportRef: { current: CatalogViewportState }
}) {
  const [downloadBySongId, setDownloadBySongId] = useState<
    Readonly<Record<string, SongDownloadState>>
  >({})
  const [removingSongIds, setRemovingSongIds] = useState<ReadonlySet<string>>(
    new Set(),
  )
  const [openSongId, setOpenSongId] = useState<string | null>(null)
  const [downloadStateCheckComplete, setDownloadStateCheckComplete] =
    useState(false)
  const downloadStateStorageUnavailable = typeof caches === 'undefined'

  useLayoutEffect(() => {
    const saved = viewportRef.current
    if (!saved.hasPosition) {
      return
    }

    const anchor = saved.anchorSongId
      ? [...document.querySelectorAll<HTMLElement>('.catalog-entry[data-song-id]')]
          .find((entry) => entry.dataset.songId === saved.anchorSongId)
      : undefined
    const anchorOffset = saved.anchorTop ?? 0
    const targetScrollY = anchor
      ? window.scrollY + anchor.getBoundingClientRect().top - anchorOffset
      : saved.scrollY
    const nextScrollY = Math.max(0, targetScrollY)
    if (Math.abs(nextScrollY - window.scrollY) > 1) {
      window.scrollTo({ top: nextScrollY, behavior: 'auto' })
    }
  }, [viewportRef])

  useEffect(() => {
    const captureViewport = (): void => captureCatalogViewport(viewportRef)
    window.addEventListener('scroll', captureViewport, { passive: true })
    return () => window.removeEventListener('scroll', captureViewport)
  }, [viewportRef])

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
      setDownloadBySongId(Object.fromEntries(entries))
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

        void downloadSongRuntime(currentEdition, runtimeClient)
          .then((refreshedState) => {
            if (active) {
              setDownloadBySongId((current) => ({
                ...current,
                [songId]: refreshedState,
              }))
            }
          })
          .catch(() => {
            // A failed background refresh must leave the last complete snapshot active.
          })
      })
    })

    return () => {
      active = false
    }
  }, [catalog, runtimeClient])

  const handleDownload = async (edition: CatalogEdition): Promise<void> => {
    setDownloadBySongId((current) => ({
      ...current,
      [edition.songId]: { songId: edition.songId, status: 'installing' },
    }))

    try {
      const state = await downloadSongRuntime(edition, runtimeClient)
      setDownloadBySongId((current) => ({
        ...current,
        [edition.songId]: state,
      }))
    } catch {
      setDownloadBySongId((current) => ({
        ...current,
        [edition.songId]: {
          songId: edition.songId,
          status: 'failed',
          errorMessage: '下载失败，请检查网络后重试。',
        },
      }))
    }
  }

  const handleRemove = async (edition: CatalogEdition): Promise<void> => {
    setRemovingSongIds((current) => new Set(current).add(edition.songId))
    try {
      await removeSongRuntime(edition.songId)
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

  const filteredEditions = catalog.editions.flatMap((catalogEdition, index) => {
    const download = downloadBySongId[catalogEdition.songId]
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

    return [{ catalogEdition, displayEdition, download, index }]
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
      <div className="library-heading">
        <h1 id="library-title">曲库</h1>
        <p className="library-lede">选择一首歌，开始阅读与学唱。</p>
        <label className="library-search">
          <span>搜索歌曲、歌手、专辑或罗马字</span>
          <input
            type="search"
            value={query}
            placeholder="搜索歌曲、歌手、专辑或罗马字"
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
        <label className="catalog-offline-filter">
          <input
            type="checkbox"
            checked={offlineOnly}
            onChange={(event) => onOfflineOnlyChange(event.target.checked)}
          />
          <span>仅显示离线可用</span>
        </label>
      </div>

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
            onClick={() => captureCatalogViewport(viewportRef)}
          >
            继续上次 →
          </a>
        </section>
      ) : null}

      <PracticeQueuePanel
        catalog={catalog}
        runtimeClient={runtimeClient}
        onBeforeNavigate={() => captureCatalogViewport(viewportRef)}
      />

      <CatalogSection
        title={offlineOnly ? '离线可用歌曲' : '全部歌曲'}
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
          filteredEditions.map(({ catalogEdition, displayEdition, download, index }) => (
            <CatalogEditionCard
              key={catalogEdition.songId}
              edition={displayEdition}
              index={index}
              runtimeClient={runtimeClient}
              download={
                download ?? {
                  songId: catalogEdition.songId,
                  status: 'not-installed',
                }
              }
              isRemoving={removingSongIds.has(catalogEdition.songId)}
              onDownload={handleDownload}
              onRemove={handleRemove}
              onBeforeNavigate={() => captureCatalogViewport(viewportRef)}
              isSwipeOpen={openSongId === catalogEdition.songId}
              onSwipeOpen={() => setOpenSongId(catalogEdition.songId)}
              onSwipeClose={() => setOpenSongId(null)}
            />
          ))
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
    </main>
  )
}

function resumeModeLabel(mode: 'practice' | 'all' | 'explain'): string {
  return mode === 'practice' ? '学唱' : mode === 'all' ? '全曲' : '讲解'
}

function CatalogSection({
  title,
  children,
  onClick,
}: {
  title: string
  children: ReactNode
  onClick?: (event: ReactMouseEvent<HTMLDivElement>) => void
}) {
  return (
    <section className="catalog-section">
      <h2>{title}</h2>
      <div className="catalog-list" aria-label={title} onClick={onClick}>
        {children}
      </div>
    </section>
  )
}

function CatalogEditionCard({
  edition,
  index,
  runtimeClient,
  download,
  isRemoving,
  onDownload,
  onRemove,
  onBeforeNavigate,
  isSwipeOpen,
  onSwipeOpen,
  onSwipeClose,
}: {
  edition: CatalogEdition
  index: number
  runtimeClient: RuntimeClient
  download: SongDownloadState
  isRemoving: boolean
  onDownload: (edition: CatalogEdition) => void
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
          <span className="catalog-index" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
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
              download={download}
              isRemoving={isRemoving}
              onDownload={onDownload}
            />
          </div>
        </div>
      </div>
    </article>
  )
}

function CatalogDownloadSlot({
  edition,
  download,
  isRemoving,
  onDownload,
}: {
  edition: CatalogEdition
  download: SongDownloadState
  isRemoving: boolean
  onDownload: (edition: CatalogEdition) => void
}) {
  const isInstalling = download.status === 'installing'
  const isInstalled = download.status === 'installed'
  const label = isRemoving
    ? '移除中…'
    : isInstalling
      ? '下载中…'
      : download.status === 'failed'
        ? '重试'
        : '下载'

  return (
    <div className="catalog-download-slot" aria-live="polite">
      {isInstalled && !isRemoving ? (
        <span
          className="catalog-download-state"
          aria-label={`已下载 ${edition.title}`}
        >
          已下载
        </span>
      ) : (
        <button
          className="catalog-download-button"
          type="button"
          disabled={isInstalling || isRemoving}
          aria-label={`${label} ${edition.title}`}
          onClick={(event) => {
            event.stopPropagation()
            onDownload(edition)
          }}
        >
          {label}
        </button>
      )}
      {download.errorMessage ? (
        <span className="catalog-download-error">{download.errorMessage}</span>
      ) : null}
    </div>
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

function EditionRoute({
  route,
  state,
  runtimeClient,
  homeHref,
  onRetry,
  preparedLoad,
}: {
  route: Extract<AppRoute, { kind: 'edition' }>
  state: CatalogState
  runtimeClient: RuntimeClient
  homeHref: string
  onRetry: () => void
  preparedLoad?: PreparedSongEditionLoad
}) {
  if (state.status === 'loading') {
    return (
      <main className="library library-status" aria-labelledby="edition-title">
        <div className="library-heading">
          <p className="eyebrow">歌曲 / 打开中</p>
          <h1 id="edition-title">正在打开歌曲…</h1>
          <p className="library-lede">正在读取歌曲内容。</p>
        </div>
        <a className="text-link" href={homeHref}>
          返回曲库
        </a>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="library library-status" aria-labelledby="edition-title">
        <div className="library-heading">
          <p className="eyebrow">歌曲 / 错误</p>
          <h1 id="edition-title">歌曲暂时无法打开</h1>
          <p className="library-lede">无法读取这首歌的内容，请重试。</p>
        </div>
        <section className="error-state" role="alert" aria-label="歌曲错误">
          <p className="empty-kicker">可恢复错误</p>
          <p>{describeRuntimeError(state.error)}</p>
          <div className="song-status-actions">
            <button type="button" className="text-button" onClick={onRetry}>
              重试
            </button>
            <a className="text-link" href={homeHref}>
              返回曲库
            </a>
          </div>
        </section>
      </main>
    )
  }

  const edition = state.catalog.editions.find(
    (candidate) => candidate.songId === route.songId,
  )
  if (!edition) {
    return (
      <main className="library library-status" aria-labelledby="edition-title">
        <div className="library-heading">
          <p className="eyebrow">歌曲 / 未找到</p>
          <h1 id="edition-title">曲库里没有这首歌</h1>
        </div>
        <a className="text-link" href={homeHref}>
          返回曲库
        </a>
      </main>
    )
  }

  return (
    <SongEditionPage
      key={edition.songId}
      catalogEdition={edition}
      runtimeClient={runtimeClient}
      homeHref={homeHref}
      preparedLoad={preparedLoad}
      continueLastRequested={route.continueLast}
      practiceQueueItemId={route.practiceQueueItemId}
    />
  )
}

function SiteFooter({ editionCount }: { editionCount: number }) {
  return (
    <footer className="site-footer">
      <p>
        一个专注于<span className="footer-signal">反复学唱</span>的曲库。
      </p>
      <p>曲库 / {String(editionCount).padStart(2, '0')}</p>
    </footer>
  )
}

function RouteChunkLoading({ pageName }: { pageName: string }) {
  return (
    <main className="library library-status" aria-labelledby="route-loading-title">
      <div className="library-heading">
        <p className="eyebrow">页面加载</p>
        <h1 id="route-loading-title">正在打开{pageName}…</h1>
      </div>
      <p className="status-line" role="status">
        正在加载{pageName}模块…
      </p>
    </main>
  )
}

interface AsyncRoutePageProps<Props extends object> {
  load: () => Promise<ComponentType<Props>>
  pageName: string
  homeHref: string
  pageProps: Props
}

function AsyncRoutePage<Props extends object>({
  load,
  pageName,
  homeHref,
  pageProps,
}: AsyncRoutePageProps<Props>) {
  const [page, setPage] = useState<ComponentType<Props> | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    void load()
      .then((loadedPage) => {
        if (active) setPage(() => loadedPage)
      })
      .catch(() => {
        if (active) setFailed(true)
      })

    return () => {
      active = false
    }
  }, [attempt, load])

  if (failed) {
    return (
      <main className="library library-status" aria-labelledby="route-error-title">
        <div className="library-heading">
          <p className="eyebrow">页面加载 / 错误</p>
          <h1 id="route-error-title">{pageName}暂时无法打开</h1>
          <p className="library-lede">模块加载失败，可以重试或返回曲库。</p>
        </div>
        <section className="error-state" role="alert" aria-label="页面加载错误">
          <p className="empty-kicker">可恢复错误</p>
          <p>{pageName}模块暂时无法加载。</p>
          <div className="song-status-actions">
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setFailed(false)
                setAttempt((value) => value + 1)
              }}
            >
              重试加载
            </button>
            <a className="text-link" href={homeHref}>
              返回曲库
            </a>
          </div>
        </section>
      </main>
    )
  }

  if (!page) return <RouteChunkLoading pageName={pageName} />

  const LoadedPage = page
  return <LoadedPage {...pageProps} />
}

function getEditionCount(state: CatalogState): number {
  return state.status === 'ready' ? state.catalog.editions.length : 0
}

function describeRuntimeError(error: unknown): string {
  if (error instanceof RuntimeClientError) {
    if (error.kind === 'offline-not-downloaded') {
      return '这首歌的当前版本尚未下载，离线时无法打开。'
    }
    if (error.kind === 'download-incomplete') {
      return '这首歌的本地下载不完整，请联网后重新下载。'
    }
    if (error.kind === 'json-parse' || error.kind === 'schema') {
      return 'Runtime 数据格式无效，请重新联网后重试。'
    }
    return `Runtime ${error.kind} while reading ${error.logicalPath}.`
  }
  return 'The runtime catalog returned an unexpected error.'
}

export default App
