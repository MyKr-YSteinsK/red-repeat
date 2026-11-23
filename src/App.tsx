import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from 'react'
import './App.css'
import { CatalogLibrary, type CatalogViewportState } from './library/CatalogLibrary'
import type { Catalog } from './library/runtime-schema'
import {
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
import type { PreparedSongEditionLoad } from './edition/use-song-edition-core'
import { hasWarmSongEditionCore, loadRuntimeSongEditionCore } from './runtime/song-edition-loader'
import {
  getUpdateManager,
  type UpdateManager,
} from './pwa/update-manager'
import { SongDownloadTaskManager } from './pwa/song-download-tasks'

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
  const [downloadTasks] = useState(() => new SongDownloadTaskManager())
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
          downloadTasks={downloadTasks}
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
            occurrenceId: route.occurrenceId,
            returnToEdition: route.returnToEdition,
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
          downloadTasks={downloadTasks}
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
  downloadTasks,
  onRetry,
  query,
  onQueryChange,
  offlineOnly,
  onOfflineOnlyChange,
  viewportRef,
}: {
  state: CatalogState
  runtimeClient: RuntimeClient
  downloadTasks: SongDownloadTaskManager
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
      downloadTasks={downloadTasks}
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
