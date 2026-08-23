import { useState } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import type { CatalogEdition } from '../library/runtime-schema'
import {
  RuntimeClient,
  RuntimeClientError,
} from '../runtime/runtime-client'
import { FullSongWorkspace } from './FullSongWorkspace'
import { PracticeWorkspace } from './PracticeWorkspace'
import { ExplainWorkspace } from './ExplainWorkspace'
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
  const state = useSongEditionCore(runtimeClient, catalogEdition, retryKey)

  if (state.status === 'loading') {
    return <SongEditionStatus homeHref={homeHref} />
  }

  if (state.status === 'error') {
    return (
      <main
        className="song-edition song-edition-status"
        aria-labelledby="song-title"
        role="alert"
      >
        <p className="eyebrow">歌曲 / 错误</p>
        <h1 id="song-title">歌曲暂时无法打开</h1>
        <p className="song-status-copy">无法读取这首歌的内容，请重试。</p>
        <p className="song-status-detail">{describeEditionError(state.error)}</p>
        <div className="song-status-actions">
          <button
            className="text-button"
            type="button"
            onClick={() => setRetryKey((value) => value + 1)}
          >
            重试
          </button>
          <a className="text-link" href={homeHref}>
            返回曲库
          </a>
        </div>
      </main>
    )
  }

  const { core } = state
  const song = core.edition.song
  return (
    <main
      className="song-edition is-practice-page"
      aria-labelledby="song-title"
      data-mode={tab}
    >
      <header className="practice-page-header">
        <div className="practice-page-identity">
          <a className="text-link" href={homeHref}>
            返回曲库
          </a>
          <div className="practice-page-song">
            <p className="eyebrow">学唱</p>
            <h1 id="song-title">{song.title}</h1>
            <p className="practice-page-artist">{song.artist}</p>
            {song.album || song.year !== undefined ? (
              <p className="practice-page-meta">
                {song.album ?? ''}
                {song.album && song.year !== undefined ? ' / ' : ''}
                {song.year ?? ''}
              </p>
            ) : null}
          </div>
          <img
            className="practice-page-cover"
            src={runtimeClient.resolveAsset(core.edition.artwork.coverSmallUrl)}
            alt={`${song.title}封面`}
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
        </div>
      </header>

      {tab === 'practice' ? (
        <PracticeWorkspace
          key={core.edition.contentHash}
          model={core.assembled}
          runtimeClient={runtimeClient}
          audioEngine={audioEngine}
          requestedPracticeUnitId={practiceNavigationRequest}
          onRequestedPracticeUnitConsumed={() => setPracticeNavigationRequest(undefined)}
        />
      ) : tab === 'all' ? (
        <FullSongWorkspace
          model={core.assembled}
          runtimeClient={runtimeClient}
          audioEngine={audioEngine}
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
  homeHref,
}: {
  homeHref: string
}) {
  return (
    <main className="song-edition song-edition-status" aria-labelledby="song-title">
      <p className="eyebrow">歌曲 / 打开中</p>
      <h1 id="song-title">正在打开歌曲…</h1>
      <p className="song-status-copy">正在读取歌曲内容。</p>
      <a className="text-link" href={homeHref}>
        返回曲库
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
