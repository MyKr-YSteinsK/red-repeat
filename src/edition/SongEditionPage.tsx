import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import type { CatalogEdition } from '../library/runtime-schema'
import {
  RuntimeClient,
  RuntimeClientError,
} from '../runtime/runtime-client'
import { SongEditionPlaybackSurface } from './SongEditionPlaybackSurface'
import { FeatureSection } from './FeatureMarkdown'
import { ThemeSwitcher } from '../theme/ThemeSwitcher'
import { resolveArtDirection } from '../theme/art-direction'
import {
  resolveThemePreference,
  writeThemePreference,
  type EditionTheme,
} from '../theme/theme-preference'
import type {
  SongEditionKeyboardActions,
  SongEditionKeyboardRegistration,
} from './song-edition-keyboard'
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
  const [themeSelection, setThemeSelection] = useState<
    { songId: string; theme: EditionTheme } | undefined
  >()
  const keyboardActions = useRef<SongEditionKeyboardActions | null>(null)
  const state = useSongEditionCore(runtimeClient, catalogEdition, retryKey)
  const currentSongId =
    state.status === 'ready' ? state.core.edition.song.songId : undefined

  const selectTheme = useCallback(
    (nextTheme: EditionTheme): void => {
      if (!currentSongId) {
        return
      }

      setThemeSelection({ songId: currentSongId, theme: nextTheme })
      writeThemePreference(currentSongId, nextTheme)
    },
    [currentSongId],
  )

  const registerKeyboardActions = useCallback<SongEditionKeyboardRegistration>(
    (actions) => {
      keyboardActions.current = actions
    },
    [],
  )

  const changeMode = useCallback((nextMode: SongEditionMode): void => {
    if (nextMode !== 'focus') {
      keyboardActions.current?.cancelPractice()
    }
    setMode(nextMode)
  }, [])

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
          changeMode('liner')
        }
        return
      }

      const actions = keyboardActions.current
      const key = event.key.toLowerCase()
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault()
        actions?.togglePlay()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        actions?.previous()
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        actions?.next()
        return
      }
      if (key === 'l') {
        event.preventDefault()
        actions?.toggleLoop()
        return
      }
      if (key === 'f') {
        event.preventDefault()
        changeMode(mode === 'focus' ? 'liner' : 'focus')
        return
      }
      if (event.key === '[') {
        event.preventDefault()
        actions?.decreaseSpeed()
        return
      }
      if (event.key === ']') {
        event.preventDefault()
        actions?.increaseSpeed()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [changeMode, mode])

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
  const theme =
    themeSelection?.songId === song.songId
      ? themeSelection.theme
      : resolveThemePreference(song.songId, core.visual.recommendedTheme)
  const artDirection = resolveArtDirection(song.songId, core.visual, theme)
  return (
    <main
      className={`song-edition${mode === 'focus' ? ' is-focus-mode' : ''}${
        mode === 'immersive' ? ' is-immersive-mode' : ''
      }`}
      aria-labelledby="song-title"
      data-theme={theme}
      data-density={artDirection.density}
      data-energy={artDirection.energy}
      data-motion={artDirection.motion}
      data-cover-treatment={artDirection.coverTreatment}
      data-composition-variant={artDirection.compositionVariant}
      data-mode={mode}
      data-focus-mode={mode === 'focus'}
    >
      <div className="song-topline">
        <a className="text-link" href={homeHref}>
          Return to Library
        </a>
        <p className="edition-signal">
          {theme.toUpperCase()} / SONG EDITION
        </p>
        <ThemeSwitcher theme={theme} onChange={selectTheme} />
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
        theme={theme}
        mode={mode}
        onModeChange={changeMode}
        onRegisterKeyboardActions={registerKeyboardActions}
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
