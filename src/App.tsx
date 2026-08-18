import { useEffect, useState } from 'react'
import './App.css'
import type { Catalog, CatalogEdition } from './library/runtime-schema'
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

  const homeHref = createLibraryHref(window.location)

  return (
    <div className="app-shell">
      <SiteHeader homeHref={homeHref} />
      {route.kind === 'library' ? (
        <LibraryRoute
          state={catalogState}
          runtimeClient={runtimeClient}
          onRetry={() => {
            setCatalogState({ status: 'loading' })
            setRetryKey((value) => value + 1)
          }}
        />
      ) : (
        <EditionRoute
          route={route}
          state={catalogState}
          runtimeClient={runtimeClient}
          homeHref={homeHref}
        />
      )}
      <SiteFooter editionCount={getEditionCount(catalogState)} />
    </div>
  )
}

function SiteHeader({ homeHref }: { homeHref: string }) {
  return (
    <header className="site-header">
      <a className="brand-lockup" href={homeHref} aria-label="RED:REPEAT home">
        <span className="brand-signal" aria-hidden="true" />
        <span className="brand-wordmark">
          <span>RED</span>
          <span className="brand-divider" aria-hidden="true">
            :
          </span>
          <span>REPEAT</span>
        </span>
      </a>
      <p className="imprint">A MYKR EDITION</p>
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
          <p className="eyebrow">LIBRARY / INDEX</p>
          <h1 id="library-title">Loading the archive.</h1>
          <p className="library-lede">Reading the current Song Editions.</p>
        </div>
        <p className="status-line" role="status">
          Loading catalog…
        </p>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="library library-status" aria-labelledby="library-title">
        <div className="library-heading">
          <p className="eyebrow">LIBRARY / INDEX</p>
          <h1 id="library-title">The archive is unavailable.</h1>
          <p className="library-lede">
            The catalog could not be read. You can try the runtime source again.
          </p>
        </div>
        <section className="error-state" role="alert" aria-label="Library error">
          <p className="empty-kicker">RECOVERABLE ERROR</p>
          <p>{describeRuntimeError(state.error)}</p>
          <button type="button" className="text-button" onClick={onRetry}>
            Retry catalog
          </button>
        </section>
      </main>
    )
  }

  const { catalog } = state
  if (catalog.editions.length === 0) {
    return <EmptyLibrary />
  }

  return <CatalogLibrary catalog={catalog} runtimeClient={runtimeClient} />
}

function EmptyLibrary() {
  return (
    <main className="library" aria-labelledby="library-title">
      <div className="library-heading">
        <p className="eyebrow">LIBRARY / INDEX</p>
        <h1 id="library-title">Your library is empty.</h1>
        <p className="library-lede">
          Song Editions will appear here when you add them.
        </p>
      </div>

      <section className="empty-state" aria-labelledby="empty-state-title">
        <p className="empty-index" aria-hidden="true">
          00
        </p>
        <div className="empty-copy">
          <p className="empty-kicker">ARCHIVE STATUS</p>
          <h2 id="empty-state-title">Begin with one song worth returning to.</h2>
          <p>Your first Song Edition will have a place here.</p>
        </div>
        <p className="empty-signal" aria-label="Library status: empty">
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
  return (
    <main className="library library-populated" aria-labelledby="library-title">
      <div className="library-heading">
        <p className="eyebrow">LIBRARY / INDEX</p>
        <h1 id="library-title">Songs worth returning to.</h1>
        <p className="library-lede">
          A private shelf of Song Editions, kept close to the work.
        </p>
      </div>

      <section className="catalog-list" aria-label="Song Editions">
        {catalog.editions.map((edition, index) => (
          <CatalogEditionLink
            key={edition.songId}
            edition={edition}
            index={index}
            runtimeClient={runtimeClient}
          />
        ))}
      </section>
    </main>
  )
}

function CatalogEditionLink({
  edition,
  index,
  runtimeClient,
}: {
  edition: CatalogEdition
  index: number
  runtimeClient: RuntimeClient
}) {
  return (
    <a
      className="catalog-entry"
      href={createEditionHref(edition.songId, window.location)}
      aria-label={`Open ${edition.title} Song Edition`}
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
        <span className="catalog-meta">
          {edition.album ?? 'Song Edition'}
          {edition.year !== undefined ? ` / ${edition.year}` : ''}
        </span>
      </span>
      <span className="catalog-theme">{edition.recommendedTheme} edition</span>
      <span className="catalog-arrow" aria-hidden="true">
        ↗
      </span>
    </a>
  )
}

function EditionRoute({
  route,
  state,
  runtimeClient,
  homeHref,
}: {
  route: Extract<AppRoute, { kind: 'edition' }>
  state: CatalogState
  runtimeClient: RuntimeClient
  homeHref: string
}) {
  if (state.status !== 'ready') {
    return (
      <main className="library library-status" aria-labelledby="edition-title">
        <div className="library-heading">
          <p className="eyebrow">SONG EDITION / OPENING</p>
          <h1 id="edition-title">Loading the edition.</h1>
          <p className="library-lede">Reading the selected work.</p>
        </div>
        <a className="text-link" href={homeHref}>
          Return to Library
        </a>
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
          <p className="eyebrow">SONG EDITION / NOT FOUND</p>
          <h1 id="edition-title">This edition is not in the archive.</h1>
        </div>
        <a className="text-link" href={homeHref}>
          Return to Library
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
        A focused archive for <span className="footer-signal">returning</span>{' '}
        to songs.
      </p>
      <p>LIBRARY / {String(editionCount).padStart(2, '0')}</p>
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
