import { describe, expect, it, vi } from 'vitest'
import type { Catalog, RuntimeEdition } from '../library/runtime-schema'
import type { RuntimeClient } from '../runtime/runtime-client'
import {
  warmCatalogRuntime,
  warmRuntimeAsset,
  warmRuntimeAssets,
} from './runtime-cache'

const catalog: Catalog = {
  contractVersion: 2,
  contentHash: 'a'.repeat(64),
  editions: [
    {
      songId: 'first-light',
      title: 'First Light',
      artist: 'A Composer',
      recommendedTheme: 'liner',
      coverUrl: '/library-runtime/songs/first-light/cover-small.a.webp',
      editionUrl: '/library-runtime/songs/first-light/edition.a.json',
    },
  ],
}

const edition: RuntimeEdition = {
  contractVersion: 2,
  contentHash: 'b'.repeat(64),
  song: { songId: 'first-light', title: 'First Light', artist: 'A Composer' },
  lyricsUrl: '/library-runtime/songs/first-light/lyrics.b.json',
  timelineUrl: '/library-runtime/songs/first-light/timeline.b.json',
  practiceUrl: '/library-runtime/songs/first-light/practice.b.json',
  visualUrl: '/library-runtime/songs/first-light/visual.b.json',
  features: [
    {
      id: 'note',
      url: '/library-runtime/songs/first-light/features/note.c.md',
    },
  ],
  audio: {
    url: '/library-runtime/songs/first-light/audio.d.m4a',
    sourceHash: 'c'.repeat(64),
    runtimeHash: 'd'.repeat(64),
    durationMs: 1000,
    format: {
      container: 'm4a',
      codec: 'aac-lc',
      bitrateKbps: 192,
      sampleRate: 48000,
      channels: 2,
    },
  },
  artwork: {
    coverSmallUrl: catalog.editions[0].coverUrl,
    coverLargeUrl: '/library-runtime/songs/first-light/cover-large.e.webp',
    heroLargeUrl: '/library-runtime/songs/first-light/hero-large.f.webp',
  },
}

describe('PWA runtime cache warmup', () => {
  it('warms with an unqualified full GET and swallows failures', async () => {
    const fetchImpl = vi.fn(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        void url
        void init
        return new Response('audio', { status: 200 })
      },
    )
    const onError = vi.fn()

    await expect(
      warmRuntimeAsset('/red-repeat/audio.m4a', {
        fetchImpl,
        isServiceWorkerControlled: () => true,
      }),
    ).resolves.toBe(true)

    expect(fetchImpl).toHaveBeenCalledWith(
      '/red-repeat/audio.m4a',
      expect.objectContaining({ method: 'GET' }),
    )
    const [, init] = fetchImpl.mock.calls[0]
    expect(init?.headers).toBeUndefined()

    fetchImpl.mockRejectedValueOnce(new Error('quota'))
    await expect(
      warmRuntimeAsset('/red-repeat/failing.m4a', {
        fetchImpl,
        isServiceWorkerControlled: () => true,
        onError,
      }),
    ).resolves.toBe(false)
    expect(onError).toHaveBeenCalledOnce()
  })

  it('does nothing when the current page is not controlled by a Service Worker', async () => {
    const fetchImpl = vi.fn()

    await expect(
      warmRuntimeAssets(['/one', '/two'], {
        fetchImpl,
        isServiceWorkerControlled: () => false,
      }),
    ).resolves.toMatchObject({ skipped: true, attempted: 0 })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('warms current catalog editions independently with bounded song concurrency', async () => {
    const fetchImpl = vi.fn(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        void url
        void init
        return new Response('ok', { status: 200 })
      },
    )
    const loadEdition = vi.fn(async (logicalPath: string) => {
      if (logicalPath.includes('missing')) {
        throw new Error('missing edition')
      }
      return edition
    })
    const runtimeClient = {
      loadEdition,
      resolveAsset: (logicalPath: string) => `/red-repeat${logicalPath}`,
    } as unknown as RuntimeClient
    const onSongError = vi.fn()
    const catalogWithFailure: Catalog = {
      ...catalog,
      editions: [
        ...catalog.editions,
        {
          ...catalog.editions[0],
          songId: 'missing-song',
          editionUrl: '/library-runtime/songs/missing-song/edition.a.json',
        },
      ],
    }

    const summary = await warmCatalogRuntime(catalogWithFailure, runtimeClient, {
      fetchImpl,
      isServiceWorkerControlled: () => true,
      songConcurrency: 1,
      assetConcurrency: 1,
      onSongError,
    })

    expect(loadEdition).toHaveBeenCalledTimes(2)
    expect(onSongError).toHaveBeenCalledWith('missing-song', expect.any(Error))
    expect(summary).toMatchObject({ skipped: false, failed: 1 })
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      '/red-repeat/library-runtime/songs/first-light/cover-small.a.webp',
      '/red-repeat/library-runtime/songs/first-light/lyrics.b.json',
      '/red-repeat/library-runtime/songs/first-light/timeline.b.json',
      '/red-repeat/library-runtime/songs/first-light/practice.b.json',
      '/red-repeat/library-runtime/songs/first-light/visual.b.json',
      '/red-repeat/library-runtime/songs/first-light/features/note.c.md',
      '/red-repeat/library-runtime/songs/first-light/cover-large.e.webp',
      '/red-repeat/library-runtime/songs/first-light/hero-large.f.webp',
      '/red-repeat/library-runtime/songs/first-light/audio.d.m4a',
    ])
  })
})
