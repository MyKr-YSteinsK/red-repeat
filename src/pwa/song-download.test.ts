import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type { RuntimeClient } from '../runtime/runtime-client'
import { RUNTIME_CACHE_NAMES } from './cache-routes'
import {
  downloadSongRuntime,
  fetchWithSongDownloadFallback,
  readSongDownloadState,
  removeSongRuntime,
  SONG_DOWNLOAD_CACHE_NAME,
} from './song-download'

const catalogEdition: CatalogEdition = {
  songId: 'first-light',
  title: 'First Light',
  artist: 'A Composer',
  coverUrl: '/library-runtime/songs/first-light/cover-small.a.webp',
  editionUrl: '/library-runtime/songs/first-light/edition.a.json',
}

const edition: RuntimeEdition = {
  contractVersion: 3,
  contentHash: 'a'.repeat(64),
  song: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
  },
  lyricsUrl: '/library-runtime/songs/first-light/lyrics.b.json',
  timelineUrl: '/library-runtime/songs/first-light/timeline.b.json',
  practiceUrl: '/library-runtime/songs/first-light/practice.b.json',
  features: [
    { id: 'note', url: '/library-runtime/songs/first-light/features/note.c.md' },
  ],
  audio: {
    url: '/library-runtime/songs/first-light/audio.d.m4a',
    sourceHash: 'b'.repeat(64),
    runtimeHash: 'c'.repeat(64),
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
    coverSmallUrl: catalogEdition.coverUrl,
    coverLargeUrl: '/library-runtime/songs/first-light/cover-large.e.webp',
  },
}

const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches')

afterEach(() => {
  if (originalCaches) {
    Object.defineProperty(globalThis, 'caches', originalCaches)
  } else {
    delete (globalThis as { caches?: CacheStorage }).caches
  }
})

describe('song download cache', () => {
  it('downloads every runtime resource, restores state, and removes the song', async () => {
    const storage = new MemoryCacheStorage()
    installCacheStorage(storage)
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) =>
      new Response(String(url), { status: 200 }),
    )
    const runtimeClient = runtimeClientFor()

    await expect(
      downloadSongRuntime(catalogEdition, runtimeClient, {
        fetchImpl,
        now: () => 123,
      }),
    ).resolves.toMatchObject({
      songId: 'first-light',
      status: 'installed',
      lastUpdatedAt: 123,
    })

    const cache = storage.cacheFor(SONG_DOWNLOAD_CACHE_NAME)
    expect(fetchImpl).toHaveBeenCalledTimes(8)
    expect(cache.entries.size).toBe(9)
    await expect(readSongDownloadState('first-light')).resolves.toMatchObject({
      songId: 'first-light',
      status: 'installed',
      lastUpdatedAt: 123,
    })

    await expect(removeSongRuntime('first-light')).resolves.toBeUndefined()
    await expect(readSongDownloadState('first-light')).resolves.toMatchObject({
      songId: 'first-light',
      status: 'not-installed',
    })
    expect(cache.entries.size).toBe(0)
  })

  it('falls back to a downloaded resource when the network is offline', async () => {
    const storage = new MemoryCacheStorage()
    installCacheStorage(storage)
    const url = 'https://example.test/red-repeat/library-runtime/songs/first-light/audio.d.m4a'
    const cache = storage.cacheFor(SONG_DOWNLOAD_CACHE_NAME)
    await cache.put(url, new Response('cached audio', { status: 200 }))
    const fetchImpl = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('offline'))

    try {
      const response = await fetchWithSongDownloadFallback(url)
      await expect(response.text()).resolves.toBe('cached audio')
      expect(fetchImpl).toHaveBeenCalledWith(url, undefined)
    } finally {
      fetchImpl.mockRestore()
    }
  })

  it('copies resources into the download cache when the Service Worker already cached them', async () => {
    const storage = new MemoryCacheStorage()
    installCacheStorage(storage)
    const editionUrl = 'https://example.test/red-repeat/library-runtime/songs/first-light/edition.a.json'
    await storage.cacheFor(RUNTIME_CACHE_NAMES.runtime).put(
      editionUrl,
      new Response('runtime cache', { status: 200 }),
    )

    await expect(
      downloadSongRuntime(catalogEdition, runtimeClientFor(), {
        fetchImpl: vi.fn(async (url: RequestInfo | URL) =>
          new Response(String(url), { status: 200 })),
        now: () => 456,
      }),
    ).resolves.toMatchObject({ status: 'installed' })

    expect(storage.cacheFor(SONG_DOWNLOAD_CACHE_NAME).entries.size).toBe(9)
    await expect(readSongDownloadState('first-light')).resolves.toMatchObject({
      songId: 'first-light',
      status: 'installed',
      lastUpdatedAt: 456,
    })
  })

  it('cleans partial resources and leaves the catalog usable after a failed download', async () => {
    const storage = new MemoryCacheStorage()
    installCacheStorage(storage)
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
      .mockRejectedValueOnce(new TypeError('offline'))

    await expect(
      downloadSongRuntime(catalogEdition, runtimeClientFor(), { fetchImpl }),
    ).rejects.toThrow('offline')
    expect(storage.cacheFor(SONG_DOWNLOAD_CACHE_NAME).entries.size).toBe(0)
    await expect(readSongDownloadState('first-light')).resolves.toMatchObject({
      status: 'not-installed',
    })
  })
})

function runtimeClientFor(): RuntimeClient {
  return {
    loadEdition: vi.fn(async () => edition),
    resolveAsset: (logicalPath: string) =>
      `https://example.test/red-repeat${logicalPath}`,
  } as unknown as RuntimeClient
}

function installCacheStorage(storage: MemoryCacheStorage): void {
  Object.defineProperty(globalThis, 'caches', {
    configurable: true,
    value: storage,
  })
}

class MemoryCacheStorage {
  private readonly caches = new Map<string, MemoryCache>()

  async open(name: string): Promise<Cache> {
    return this.cacheFor(name) as unknown as Cache
  }

  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    for (const cache of this.caches.values()) {
      const response = await cache.match(request)
      if (response) {
        return response
      }
    }
    return undefined
  }

  cacheFor(name: string): MemoryCache {
    const existing = this.caches.get(name)
    if (existing) {
      return existing
    }
    const cache = new MemoryCache()
    this.caches.set(name, cache)
    return cache
  }
}

class MemoryCache {
  readonly entries = new Map<string, Response>()

  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    const response = this.entries.get(cacheKey(request))
    return response?.clone()
  }

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    this.entries.set(cacheKey(request), response.clone())
  }

  async delete(request: RequestInfo | URL): Promise<boolean> {
    return this.entries.delete(cacheKey(request))
  }

  async keys(): Promise<Request[]> {
    return [...this.entries.keys()].map((url) => new Request(url))
  }
}

function cacheKey(request: RequestInfo | URL): string {
  return typeof request === 'string'
    ? request
    : request instanceof URL
      ? request.toString()
      : request.url
}
