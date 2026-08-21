import { useCallback, useState } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import type { CatalogEdition } from '../library/runtime-schema'
import {
  RuntimeClient,
  RuntimeClientError,
} from '../runtime/runtime-client'
import { FullSongWorkspace } from './FullSongWorkspace'
import { PracticeWorkspace } from './PracticeWorkspace'
import { ExplainWorkspace } from './ExplainWorkspace'
import { ThemeSwitcher } from '../theme/ThemeSwitcher'
import { resolveArtDirection } from '../theme/art-direction'
import {
  resolveThemePreference,
  writeThemePreference,
  type EditionTheme,
} from '../theme/theme-preference'
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
  const [practiceNavigationRequest, setPracticeNavigationRequest] = useState<
    string | undefined
  >()
  const [themeSelection, setThemeSelection] = useState<
    { songId: string; theme: EditionTheme } | undefined
  >()
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
      className="song-edition is-practice-page"
      aria-labelledby="song-title"
      data-theme={theme}
      data-density={artDirection.density}
      data-energy={artDirection.energy}
      data-motion={artDirection.motion}
      data-cover-treatment={artDirection.coverTreatment}
      data-composition-variant={artDirection.compositionVariant}
      data-mode={tab}
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
              onClick={() => {
                setPracticeNavigationRequest(undefined)
                setTab('practice')
              }}
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
          requestedPracticeUnitId={practiceNavigationRequest}
          onRequestedPracticeUnitConsumed={() => setPracticeNavigationRequest(undefined)}
        />
      ) : tab === 'all' ? (
        <FullSongWorkspace
          model={core.assembled}
          runtimeClient={runtimeClient}
          audioEngine={audioEngine}
          theme={theme}
          onStartPracticeUnit={(practiceUnitId) => {
            setPracticeNavigationRequest(practiceUnitId)
            setTab('practice')
          }}
        />
      ) : (
        <ExplainWorkspace
          model={core.assembled}
          runtimeClient={runtimeClient}
          features={core.features}
          featureErrors={core.featureErrors}
          audioEngine={audioEngine}
          theme={theme}
          onStartPracticeUnit={(practiceUnitId) => {
            setPracticeNavigationRequest(practiceUnitId)
            setTab('practice')
          }}
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
