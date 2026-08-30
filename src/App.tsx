import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import './App.css'
import type { Catalog, CatalogEdition } from './library/runtime-schema'
import {
  createEditionHref,
  createLibraryHref,
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
import { TimingDebuggerPage } from './debugger/TimingDebuggerPage'
import { useSwipeReveal } from './library/use-swipe-reveal'
import { SettingsPage } from './settings/SettingsPage'
import { warmCatalogRuntime } from './pwa/runtime-cache'
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

  useEffect(() => {
    const updateRoute = (): void => setRoute(parseAppRoute(window.location))
    window.addEventListener('hashchange', updateRoute)
    window.addEventListener('popstate', updateRoute)
    return () => {
      window.removeEventListener('hashchange', updateRoute)
      window.removeEventListener('popstate', updateRoute)
    }
  }, [])

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

  useEffect(() => {
    if (catalogState.status !== 'ready') {
      return
    }

    const controller = new AbortController()
    void warmCatalogRuntime(catalogState.catalog, runtimeClient, {
      signal: controller.signal,
    })

    return () => controller.abort()
  }, [catalogState, runtimeClient])

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
        />
      ) : route.kind === 'settings' ? (
        <SettingsPage
          catalogState={catalogState}
          runtimeClient={runtimeClient}
          homeHref={homeHref}
          onRetryCatalog={retryCatalog}
          updateManager={currentUpdateManager}
          highlightVersion={route.releaseVersion}
        />
      ) : route.kind === 'timing-debugger' ? (
        <TimingDebuggerPage
          songId={route.songId}
          catalogState={catalogState}
          runtimeClient={runtimeClient}
          homeHref={homeHref}
          onRetryCatalog={retryCatalog}
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
        />
      ) : (
        <EditionRoute
          route={route}
          state={catalogState}
          runtimeClient={runtimeClient}
          homeHref={homeHref}
          onRetry={retryCatalog}
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
}: {
  state: CatalogState
  runtimeClient: RuntimeClient
  onRetry: () => void
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
}: {
  catalog: Catalog
  runtimeClient: RuntimeClient
}) {
  const [query, setQuery] = useState('')
  const [downloadBySongId, setDownloadBySongId] = useState<
    Readonly<Record<string, SongDownloadState>>
  >({})
  const [removingSongIds, setRemovingSongIds] = useState<ReadonlySet<string>>(
    new Set(),
  )
  const [openSongId, setOpenSongId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void Promise.all(
      catalog.editions.map(async (edition) => [
        edition.songId,
        await readSongDownloadState(edition.songId),
      ] as const),
    ).then((entries) => {
      if (!active) {
        return
      }
      setDownloadBySongId(Object.fromEntries(entries))

      entries.forEach(([songId, state]) => {
        const currentEdition = catalog.editions.find(
          (edition) => edition.songId === songId,
        )
        if (
          state.status !== 'installed' ||
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

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredEditions = catalog.editions.filter((edition) =>
    matchesCatalogSearch(edition, normalizedQuery),
  )

  return (
    <main className="library library-populated" aria-labelledby="library-title">
      <div className="library-heading">
        <h1 id="library-title">曲库</h1>
        <p className="library-lede">选择一首歌，开始阅读与学唱。</p>
        <label className="library-search">
          <span>搜索歌曲或歌手</span>
          <input
            type="search"
            value={query}
            placeholder="搜索歌曲或歌手"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <CatalogSection
        title="全部歌曲"
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
        {filteredEditions.length > 0 ? (
          filteredEditions.map((edition) => (
            <CatalogEditionCard
              key={edition.songId}
              edition={edition}
              index={catalog.editions.indexOf(edition)}
              runtimeClient={runtimeClient}
              download={
                downloadBySongId[edition.songId] ?? {
                  songId: edition.songId,
                  status: 'not-installed',
                }
              }
              isRemoving={removingSongIds.has(edition.songId)}
              onDownload={handleDownload}
              onRemove={handleRemove}
              isSwipeOpen={openSongId === edition.songId}
              onSwipeOpen={() => setOpenSongId(edition.songId)}
              onSwipeClose={() => setOpenSongId(null)}
            />
          ))
        ) : (
          <div className="catalog-no-results" role="status">
            <strong>没有找到歌曲</strong>
            <span>试试其他歌曲名或歌手。</span>
          </div>
        )}
      </CatalogSection>
    </main>
  )
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

function matchesCatalogSearch(
  edition: CatalogEdition,
  normalizedQuery: string,
): boolean {
  if (!normalizedQuery) {
    return true
  }
  return [edition.title, edition.artist].some((value) =>
    value.toLocaleLowerCase().includes(normalizedQuery),
  )
}

function EditionRoute({
  route,
  state,
  runtimeClient,
  homeHref,
  onRetry,
}: {
  route: Extract<AppRoute, { kind: 'edition' }>
  state: CatalogState
  runtimeClient: RuntimeClient
  homeHref: string
  onRetry: () => void
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
