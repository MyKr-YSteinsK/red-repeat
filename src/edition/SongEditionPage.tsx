import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import type { CatalogEdition } from '../library/runtime-schema'
import {
  RuntimeClient,
  RuntimeClientError,
} from '../runtime/runtime-client'
import { SongEditionPlaybackSurface } from './SongEditionPlaybackSurface'
import { PracticeWorkspace } from './PracticeWorkspace'
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

type SongEditionTab = 'practice' | 'all' | 'explain'

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
  const [tab, setTab] = useState<SongEditionTab>('practice')
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
    if (tab === 'practice') {
      return
    }

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
  }, [changeMode, mode, tab])

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
      className={`song-edition is-practice-page${
        mode === 'focus' && tab === 'all' ? ' is-focus-mode' : ''
      }${mode === 'immersive' && tab === 'all' ? ' is-immersive-mode' : ''}`}
      aria-labelledby="song-title"
      data-theme={theme}
      data-density={artDirection.density}
      data-energy={artDirection.energy}
      data-motion={artDirection.motion}
      data-cover-treatment={artDirection.coverTreatment}
      data-composition-variant={artDirection.compositionVariant}
      data-mode={tab === 'all' ? mode : tab}
      data-focus-mode={tab === 'all' && mode === 'focus'}
    >
      <header className="practice-page-header">
        <div className="practice-page-identity">
          <a className="text-link" href={homeHref}>
            返回曲库
          </a>
          <div className="practice-page-song">
            <p className="eyebrow">学唱 / SONG EDITION</p>
            <h1 id="song-title">{song.title}</h1>
            <p className="practice-page-artist">{song.artist}</p>
            {song.album || song.year !== undefined ? (
              <p className="practice-page-meta">
                {song.album ?? 'Song Edition'}
                {song.year !== undefined ? ` / ${song.year}` : ''}
              </p>
            ) : null}
          </div>
          <img
            className="practice-page-cover"
            src={runtimeClient.resolveAsset(core.edition.artwork.coverSmallUrl)}
            alt={`${song.title} cover artwork`}
          />
        </div>
        <div className="practice-page-tools">
          <nav className="edition-task-nav" aria-label="歌曲任务">
            <button
              type="button"
              className={tab === 'practice' ? 'is-active' : ''}
              aria-current={tab === 'practice' ? 'page' : undefined}
              onClick={() => setTab('practice')}
            >
              学唱
            </button>
            <button
              type="button"
              className={tab === 'all' ? 'is-active' : ''}
              aria-current={tab === 'all' ? 'page' : undefined}
              onClick={() => setTab('all')}
            >
              全曲
            </button>
            <button
              type="button"
              className={tab === 'explain' ? 'is-active' : ''}
              aria-current={tab === 'explain' ? 'page' : undefined}
              onClick={() => setTab('explain')}
            >
              讲解
            </button>
          </nav>
          <ThemeSwitcher theme={theme} onChange={selectTheme} />
        </div>
      </header>

      {tab === 'practice' ? (
        <PracticeWorkspace
          key={core.edition.contentHash}
          model={core.assembled}
          runtimeClient={runtimeClient}
          audioEngine={audioEngine}
          theme={theme}
        />
      ) : tab === 'all' ? (
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
      ) : (
        <FeatureSection
          model={core.assembled}
          features={core.features}
          featureErrors={core.featureErrors}
        />
      )}
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
