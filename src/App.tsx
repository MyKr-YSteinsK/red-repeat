import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import './App.css'
import type { Catalog, CatalogEdition } from './library/runtime-schema'
import { loadCatalogPracticeResume } from './library/catalog-resume'
import {
  readPracticeResumeMetadata,
  type PracticeResumeSummary,
} from './practice/practice-state'
import {
  createEditionHref,
  createLibraryHref,
  parseAppRoute,
  type AppRoute,
} from './navigation'
import {
  createRuntimeClient,
  RuntimeClient,
  RuntimeClientError,
} from './runtime/runtime-client'
import { SongEditionPage } from './edition/SongEditionPage'
import { warmCatalogRuntime } from './pwa/runtime-cache'

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
}

type CatalogState =
  | { status: 'loading' }
  | { status: 'ready'; catalog: Catalog }
  | { status: 'error'; error: unknown }

function App({ runtimeClient = defaultRuntimeClient }: AppProps) {
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
  const retryCatalog = (): void => {
    setCatalogState({ status: 'loading' })
    setRetryKey((value) => value + 1)
  }

  return (
    <div className="app-shell">
      <SiteHeader homeHref={homeHref} />
      {route.kind === 'library' ? (
        <LibraryRoute
          state={catalogState}
          runtimeClient={runtimeClient}
          onRetry={retryCatalog}
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

function SiteHeader({ homeHref }: { homeHref: string }) {
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
      <p className="imprint">MYKR 制作</p>
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
  const [resumeBySongId, setResumeBySongId] = useState<
    Readonly<Record<string, PracticeResumeSummary>>
  >({})

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const candidates = catalog.editions.filter((edition) =>
      Boolean(readPracticeResumeMetadata(edition.songId)),
    )

    candidates.forEach((edition) => {
      void loadCatalogPracticeResume(runtimeClient, edition, {
        signal: controller.signal,
      }).then((summary) => {
        if (!active || !summary) {
          return
        }
        setResumeBySongId((current) => ({
          ...current,
          [edition.songId]: summary,
        }))
      })
    })

    return () => {
      active = false
      controller.abort()
    }
  }, [catalog, runtimeClient])

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredEditions = catalog.editions.filter((edition) =>
    matchesCatalogSearch(edition, normalizedQuery),
  )
  const recentEditions = useMemo(
    () =>
      catalog.editions
        .filter((edition) => resumeBySongId[edition.songId] !== undefined)
        .sort(
          (left, right) =>
            (resumeBySongId[right.songId]?.updatedAt ?? 0) -
            (resumeBySongId[left.songId]?.updatedAt ?? 0),
        )
        .slice(0, 5),
    [catalog.editions, resumeBySongId],
  )

  return (
    <main className="library library-populated" aria-labelledby="library-title">
      <div className="library-heading">
        <p className="eyebrow">曲库</p>
        <h1 id="library-title">我的歌曲</h1>
        <p className="library-lede">选择一首歌，开始或继续学唱。</p>
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

      {normalizedQuery === '' && recentEditions.length > 0 ? (
        <CatalogSection title="最近学习" className="recent-learning">
          {recentEditions.map((edition) => (
            <CatalogEditionLink
              key={edition.songId}
              edition={edition}
              index={catalog.editions.indexOf(edition)}
              runtimeClient={runtimeClient}
              resume={resumeBySongId[edition.songId]}
            />
          ))}
        </CatalogSection>
      ) : null}

      <CatalogSection title="全部歌曲">
        {filteredEditions.length > 0 ? (
          filteredEditions.map((edition) => (
            <CatalogEditionLink
              key={edition.songId}
              edition={edition}
              index={catalog.editions.indexOf(edition)}
              runtimeClient={runtimeClient}
              resume={resumeBySongId[edition.songId]}
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
  className,
  children,
}: {
  title: string
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`catalog-section${className ? ` ${className}` : ''}`}>
      <h2>{title}</h2>
      <div className="catalog-list" aria-label={title}>
        {children}
      </div>
    </section>
  )
}

function CatalogEditionLink({
  edition,
  index,
  runtimeClient,
  resume,
}: {
  edition: CatalogEdition
  index: number
  runtimeClient: RuntimeClient
  resume?: PracticeResumeSummary
}) {
  const action = resume ? '继续学唱' : '开始学唱'
  return (
    <a
      className="catalog-entry"
      href={createEditionHref(edition.songId, window.location)}
      aria-label={`${action} ${edition.title}`}
    >
      <span className="catalog-index" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      <img
        className="catalog-cover"
        src={runtimeClient.resolveAsset(edition.coverUrl)}
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
        {resume ? (
          <span className="catalog-resume">
            上次：{resume.unitLabel} · 第{resume.lineIndex}句
          </span>
        ) : null}
        <span className="catalog-action">{action}</span>
      </span>
      <span className="catalog-arrow" aria-hidden="true">
        ↗
      </span>
    </a>
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
    return `Runtime ${error.kind} while reading ${error.logicalPath}.`
  }
  return 'The runtime catalog returned an unexpected error.'
}

export default App
