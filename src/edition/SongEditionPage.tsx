import { useEffect, useState } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import type { CatalogEdition } from '../library/runtime-schema'
import {
  RuntimeClient,
  RuntimeClientError,
} from '../runtime/runtime-client'
import { SongEditionPlaybackSurface } from './SongEditionPlaybackSurface'
import { FeatureSection } from './FeatureMarkdown'
import type { SongEditionMode } from './song-edition-mode'
import { useSongEditionCore } from './use-song-edition-core'

export interface SongEditionPageProps {
  catalogEdition: CatalogEdition
  runtimeClient: RuntimeClient
  homeHref: string
  audioEngine?: AudioEngine
}

export function SongEditionPage({
  catalogEdition,
  runtimeClient,
  homeHref,
  audioEngine,
}: SongEditionPageProps) {
  const [retryKey, setRetryKey] = useState(0)
  const [mode, setMode] = useState<SongEditionMode>('liner')
  const [readingVisible, setReadingVisible] = useState(false)
  const state = useSongEditionCore(runtimeClient, catalogEdition, retryKey)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditableTarget(event.target)
      ) {
        return
      }

      if (event.key === 'Escape') {
        if (mode !== 'liner') {
          event.preventDefault()
          setMode('liner')
        }
        return
      }

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        setMode((currentMode) =>
          currentMode === 'focus' ? 'liner' : 'focus',
        )
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode])

  if (state.status === 'loading') {
    return <SongEditionStatus catalogEdition={catalogEdition} homeHref={homeHref} />
  }

  if (state.status === 'error') {
    return (
      <main
        className="song-edition song-edition-status"
        aria-labelledby="song-title"
        role="alert"
      >
        <p className="eyebrow">SONG EDITION / ERROR</p>
        <h1 id="song-title">This edition could not be opened.</h1>
        <p className="song-status-copy">{describeEditionError(state.error)}</p>
        <div className="song-status-actions">
          <button
            className="text-button"
            type="button"
            onClick={() => setRetryKey((value) => value + 1)}
          >
            Retry edition
          </button>
          <a className="text-link" href={homeHref}>
            Return to Library
          </a>
        </div>
      </main>
    )
  }

  const { core } = state
  const song = core.edition.song
  return (
    <main
      className={`song-edition${mode === 'focus' ? ' is-focus-mode' : ''}${
        mode === 'immersive' ? ' is-immersive-mode' : ''
      }`}
      aria-labelledby="song-title"
      data-mode={mode}
      data-focus-mode={mode === 'focus'}
    >
      <div className="song-topline">
        <a className="text-link" href={homeHref}>
          Return to Library
        </a>
        <p className="edition-signal">LINER / SONG EDITION</p>
      </div>

      <section className="song-opening">
        <div className="song-artwork">
          <img
            className="song-cover-large"
            src={runtimeClient.resolveAsset(core.edition.artwork.coverLargeUrl)}
            alt={`${song.title} cover artwork`}
          />
          {core.edition.artwork.heroLargeUrl ? (
            <img
              className="song-hero-large"
              src={runtimeClient.resolveAsset(core.edition.artwork.heroLargeUrl)}
              alt=""
            />
          ) : null}
        </div>

        <div className="song-opening-copy">
          <p className="eyebrow">EDITION / {core.visual.recommendedTheme}</p>
          <h1 id="song-title">{song.title}</h1>
          <p className="song-artist">{song.artist}</p>
          {song.album || song.year !== undefined ? (
            <p className="song-album">
              {song.album ?? 'Song Edition'}
              {song.year !== undefined ? ` / ${song.year}` : ''}
            </p>
          ) : null}
          {song.intro ? <p className="song-intro">{song.intro}</p> : null}
          <dl className="edition-metadata">
            <div>
              <dt>Edition</dt>
              <dd>{catalogEdition.songId}</dd>
            </div>
            <div>
              <dt>Reading layer</dt>
              <dd>Liner</dd>
            </div>
          </dl>
          <p className="song-opening-note">
            A focused reading of the work, held in time.
          </p>
        </div>
      </section>

      <div className="song-opening-rule" aria-hidden="true" />
      <p className="song-next-cue">Lyrics and timeline follow below.</p>
      <SongEditionPlaybackSurface
        model={core.assembled}
        runtimeClient={runtimeClient}
        audioEngine={audioEngine}
        mode={mode}
        onModeChange={setMode}
        readingVisible={readingVisible}
        onToggleReading={() => setReadingVisible((visible) => !visible)}
      />
      {mode === 'liner' ? (
        <FeatureSection
          model={core.assembled}
          features={core.features}
          featureErrors={core.featureErrors}
        />
      ) : null}
    </main>
  )
}

function SongEditionStatus({
  catalogEdition,
  homeHref,
}: {
  catalogEdition: CatalogEdition
  homeHref: string
}) {
  return (
    <main className="song-edition song-edition-status" aria-labelledby="song-title">
      <p className="eyebrow">SONG EDITION / OPENING</p>
      <h1 id="song-title">Opening {catalogEdition.title}.</h1>
      <p className="song-status-copy">Reading the edition resources.</p>
      <a className="text-link" href={homeHref}>
        Return to Library
      </a>
    </main>
  )
}

function describeEditionError(error: unknown): string {
  if (error instanceof RuntimeClientError) {
    return `Runtime ${error.kind} while reading ${error.logicalPath}.`
  }
  return 'The edition resources returned an unexpected error.'
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  )
}
