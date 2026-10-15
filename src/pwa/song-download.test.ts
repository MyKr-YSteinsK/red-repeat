import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import { useSongEditionCore } from '../edition/use-song-edition-core'
import type { RuntimeClient } from '../runtime/runtime-client'
import { loadRuntimeSongEditionCore } from '../runtime/song-edition-loader'
import {
  downloadSongRuntime,
  fetchWithSongDownloadFallback,
  readDownloadedSongSnapshot,
  readSongDownloadState,
  removeSongRuntime,
  SONG_DOWNLOAD_CACHE_NAME,
  SongDownloadFetchError,
} from './song-download'

const HASH_A = 'a'.repeat(64)
const HASH_B = 'b'.repeat(64)
const HASH_C = 'c'.repeat(64)
const HASH_D = 'd'.repeat(64)
const HASH_E = 'e'.repeat(64)
const HASH_F = 'f'.repeat(64)

const snapshotH1 = createSnapshotFixtures('a', HASH_A)
const snapshotH2 = createSnapshotFixtures('b', HASH_B)

const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches')

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
  if (originalCaches) {
    Object.defineProperty(globalThis, 'caches', originalCaches)
  } else {
    delete (globalThis as { caches?: CacheStorage }).caches
  }
})

describe('song download snapshot cache', () => {
  it('reports indeterminate preparation before verified resource progress', async () => {
    const storage = new MemoryCacheStorage()
    installCacheStorage(storage)
    const progress: Array<{
      phase: string
      completedResources: number
      totalResources?: number
    }> = []

    await downloadSongRuntime(
      snapshotH1.catalogEdition,
      runtimeClientFor(snapshotH1),
      {
        fetchImpl: fixtureFetch(snapshotH1),
        onProgress: (value) => progress.push(value),
      },
    )

    expect(progress[0]).toMatchObject({
      phase: 'preparing',
      completedResources: 0,
    })
    expect(progress[0]).not.toHaveProperty('totalResources')
    expect(progress).toContainEqual({
      phase: 'downloading',
      completedResources: 0,
      totalResources: 9,
    })
    expect(progress.at(-2)).toMatchObject({
      phase: 'verifying',
      completedResources: 9,
      totalResources: 9,
    })
    expect(progress.at(-1)).toMatchObject({
      phase: 'committing',
      completedResources: 9,
      totalResources: 9,
    })
  })

  it('cancels an initial download after an awaited fetch without installing partial resources', async () => {
    const storage = new MemoryCacheStorage()
    installCacheStorage(storage)
    const controller = new AbortController()
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      controller.abort()
      return responseForLogicalPath(runtimePath(String(input)), snapshotH1)
    })

    await expect(
      downloadSongRuntime(
        snapshotH1.catalogEdition,
        runtimeClientFor(snapshotH1),
        { fetchImpl, signal: controller.signal },
      ),
    ).rejects.toMatchObject({ name: 'AbortError' })

    const cache = storage.cacheFor(SONG_DOWNLOAD_CACHE_NAME)
    expect(cache.entries.size).toBe(0)
    await expect(readSongDownloadState('first-light')).resolves.toMatchObject({
      status: 'not-installed',
    })
  })

  it('keeps H1 readable when H2 is cancelled after a resource has been staged', async () => {
    const storage = new MemoryCacheStorage()
    installCacheStorage(storage)
    await downloadSongRuntime(
      snapshotH1.catalogEdition,
      runtimeClientFor(snapshotH1),
      { fetchImpl: fixtureFetch(snapshotH1) },
    )
    const controller = new AbortController()
    await expect(
      downloadSongRuntime(
        snapshotH2.catalogEdition,
        runtimeClientFor(snapshotH2),
        {
          fetchImpl: fixtureFetch(snapshotH2),
          signal: controller.signal,
          onProgress: (progress) => {
            if (
              progress.phase === 'downloading' &&
              progress.completedResources === 1
            ) {
              controller.abort()
            }
          },
        },
      ),
    ).rejects.toMatchObject({ name: 'AbortError' })

    const cache = storage.cacheFor(SONG_DOWNLOAD_CACHE_NAME)
    expect(
      [...cache.entries.keys()].some((url) =>
        url.includes(`/songs/first-light/${HASH_B}`),
      ),
    ).toBe(false)
    await expect(readDownloadedSongSnapshot('first-light')).resolves.toMatchObject({
      contentHash: HASH_A,
      catalogEdition: snapshotH1.catalogEdition,
    })
  })

  it('treats a manifest write that succeeds after abort as a completed H2 commit', async () => {
    const storage = new MemoryCacheStorage()
    installCacheStorage(storage)
    await downloadSongRuntime(
      snapshotH1.catalogEdition,
      runtimeClientFor(snapshotH1),
      { fetchImpl: fixtureFetch(snapshotH1) },
    )
    const cache = storage.cacheFor(SONG_DOWNLOAD_CACHE_NAME)
    const originalPut = cache.put.bind(cache)
    const controller = new AbortController()
    vi.spyOn(cache, 'put').mockImplementation(async (request, response) => {
      if (cacheKey(request) === manifestUrl('first-light')) {
        controller.abort()
      }
      await originalPut(request, response)
    })

    await expect(
      downloadSongRuntime(
        snapshotH2.catalogEdition,
        runtimeClientFor(snapshotH2),
        {
          fetchImpl: fixtureFetch(snapshotH2),
          signal: controller.signal,
        },
      ),
    ).resolves.toMatchObject({ status: 'installed', contentHash: HASH_B })
    await expect(readDownloadedSongSnapshot('first-light')).resolves.toMatchObject({
      contentHash: HASH_B,
      catalogEdition: snapshotH2.catalogEdition,
    })
  })

  it('commits a complete v2 snapshot, reads locally before network, and removes all owned resources', async () => {
    const storage = new MemoryCacheStorage()
    installCacheStorage(storage)
    const fetchImpl = fixtureFetch(snapshotH1)

    await expect(
      downloadSongRuntime(
        snapshotH1.catalogEdition,
        runtimeClientFor(snapshotH1),
        { fetchImpl, now: () => 123 },
      ),
    ).resolves.toMatchObject({
      songId: 'first-light',
      status: 'installed',
      contentHash: HASH_A,
      editionUrl: snapshotH1.catalogEdition.editionUrl,
      lastUpdatedAt: 123,
    })

    const cache = storage.cacheFor(SONG_DOWNLOAD_CACHE_NAME)
    expect(fetchImpl).toHaveBeenCalledTimes(9)
    expect(cache.entries.size).toBe(10)
    await expect(readSongDownloadState('first-light')).resolves.toMatchObject({
      status: 'installed',
      contentHash: HASH_A,
      snapshotEdition: snapshotH1.catalogEdition,
    })

    const manifest = await readManifest(cache, 'first-light') as {
      urls: string[]
    }
    expect(manifest).toMatchObject({
      schemaVersion: 2,
      contentHash: HASH_A,
      catalogEdition: snapshotH1.catalogEdition,
    })
    expect(manifest.urls).toContain(
      absoluteUrl(snapshotH1.catalogEdition.coverUrl),
    )
    expect(manifest.urls).toContain(
      absoluteUrl(snapshotH1.edition.artwork.coverSmallUrl),
    )
    expect(snapshotH1.catalogEdition.coverUrl).not.toBe(
      snapshotH1.edition.artwork.coverSmallUrl,
    )

    const networkFetch = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => new Promise<Response>(() => undefined))
    const practiceUrl = absoluteUrl(snapshotH1.edition.practiceUrl)
    const localResponse = await fetchWithSongDownloadFallback(practiceUrl)
    await expect(localResponse.json()).resolves.toEqual({ units: [] })
    expect(networkFetch).not.toHaveBeenCalled()

    await expect(removeSongRuntime('first-light')).resolves.toBeUndefined()
    await expect(readSongDownloadState('first-light')).resolves.toMatchObject({
      status: 'not-installed',
    })
    expect(cache.entries.size).toBe(0)
  })

  it('migrates a complete v1 manifest in place without deleting the download', async () => {
    const storage = new MemoryCacheStorage()
    installCacheStorage(storage)
    const legacyH1 = createSnapshotFixtures('a', HASH_A, false)
    await downloadSongRuntime(
      legacyH1.catalogEdition,
      runtimeClientFor(legacyH1),
      { fetchImpl: fixtureFetch(legacyH1), now: () => 456 },
    )

    const cache = storage.cacheFor(SONG_DOWNLOAD_CACHE_NAME)
    const v2 = await readManifest(cache, 'first-light') as {
      urls: string[]
      installedAt: number
    }
    await cache.put(
      manifestUrl('first-light'),
      jsonResponse({
        schemaVersion: 1,
        songId: 'first-light',
        contentHash: HASH_A,
        urls: v2.urls,
        installedAt: v2.installedAt,
      }),
    )

    await expect(readSongDownloadState('first-light')).resolves.toMatchObject({
      status: 'installed',
      contentHash: HASH_A,
      editionUrl: legacyH1.catalogEdition.editionUrl,
    })
    await expect(readManifest(cache, 'first-light')).resolves.toMatchObject({
      schemaVersion: 2,
      catalogEdition: legacyH1.catalogEdition,
    })
  })

  it('marks a missing required resource incomplete and reports the offline case explicitly', async () => {
    const storage = new MemoryCacheStorage()
    installCacheStorage(storage)
    await downloadSongRuntime(
      snapshotH1.catalogEdition,
      runtimeClientFor(snapshotH1),
      { fetchImpl: fixtureFetch(snapshotH1) },
    )

    const practiceUrl = absoluteUrl(snapshotH1.edition.practiceUrl)
    await storage.cacheFor(SONG_DOWNLOAD_CACHE_NAME).delete(practiceUrl)
    await expect(readSongDownloadState('first-light')).resolves.toMatchObject({
      status: 'failed',
      failureKind: 'incomplete',
      errorMessage: '本地下载不完整，请联网后重新下载。',
    })

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
    await expect(
      fetchWithSongDownloadFallback(practiceUrl),
    ).rejects.toSatisfy((error: unknown) =>
      error instanceof SongDownloadFetchError &&
      error.kind === 'download-incomplete',
    )
  })

  it('keeps H1 active when H2 staging fails, then switches only after H2 is complete', async () => {
    const storage = new MemoryCacheStorage()
    installCacheStorage(storage)
    await downloadSongRuntime(
      snapshotH1.catalogEdition,
      runtimeClientFor(snapshotH1),
      { fetchImpl: fixtureFetch(snapshotH1), now: () => 100 },
    )

    const failedRefreshFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        responseForLogicalPath(
          snapshotH2.catalogEdition.editionUrl,
          snapshotH2,
        ),
      )
      .mockRejectedValueOnce(new TypeError('refresh failed'))

    await expect(
      downloadSongRuntime(
        snapshotH2.catalogEdition,
        runtimeClientFor(snapshotH2),
        { fetchImpl: failedRefreshFetch, now: () => 200 },
      ),
    ).rejects.toThrow('refresh failed')
    await expect(readDownloadedSongSnapshot('first-light')).resolves.toMatchObject({
      contentHash: HASH_A,
      catalogEdition: snapshotH1.catalogEdition,
    })

    await expect(
      downloadSongRuntime(
        snapshotH2.catalogEdition,
        runtimeClientFor(snapshotH2),
        { fetchImpl: fixtureFetch(snapshotH2), now: () => 300 },
      ),
    ).resolves.toMatchObject({
      status: 'installed',
      contentHash: HASH_B,
      lastUpdatedAt: 300,
    })
    await expect(readDownloadedSongSnapshot('first-light')).resolves.toMatchObject({
      contentHash: HASH_B,
      catalogEdition: snapshotH2.catalogEdition,
    })

    const manifest = await readManifest(
      storage.cacheFor(SONG_DOWNLOAD_CACHE_NAME),
      'first-light',
    ) as { urls: string[] }
    expect(manifest.urls).toContain(
      absoluteUrl(snapshotH2.edition.practiceUrl),
    )
    expect(manifest.urls).toContain(
      absoluteUrl(snapshotH2.catalogEdition.coverUrl),
    )
    expect(manifest.urls).toContain(
      absoluteUrl(snapshotH2.edition.artwork.coverSmallUrl),
    )
    expect(manifest.urls).not.toContain(
      absoluteUrl(snapshotH1.edition.practiceUrl),
    )
    expect(manifest.urls).not.toContain(
      absoluteUrl(snapshotH1.catalogEdition.coverUrl),
    )
  })

  it('opens the complete H1 snapshot when the current catalog points to unavailable H2', async () => {
    const storage = new MemoryCacheStorage()
    installCacheStorage(storage)
    await downloadSongRuntime(
      snapshotH1.catalogEdition,
      runtimeClientFor(snapshotH1),
      { fetchImpl: fixtureFetch(snapshotH1) },
    )
    const offlineClient = {
      loadEdition: vi.fn(async (logicalPath: string) => {
        expect(logicalPath).toBe(snapshotH1.catalogEdition.editionUrl)
        return snapshotH1.edition
      }),
      loadLyrics: vi.fn(async () => ({ segments: [] })),
      loadTimeline: vi.fn(async () => ({
        audioSourceHash: snapshotH1.edition.audio.sourceHash,
        sections: [],
        occurrences: [],
      })),
      loadPractice: vi.fn(async () => ({ units: [] })),
      loadFeature: vi.fn(async () => '# Feature\n'),
      resolveAsset: (logicalPath: string) => absoluteUrl(logicalPath),
    } as unknown as RuntimeClient

    const core = await loadRuntimeSongEditionCore(
      offlineClient,
      snapshotH2.catalogEdition,
    )

    expect(core.catalogEdition).toEqual(snapshotH1.catalogEdition)
    expect(core.edition.contentHash).toBe(HASH_A)
    expect(offlineClient.loadEdition).toHaveBeenCalledWith(
      snapshotH1.catalogEdition.editionUrl,
      {},
    )
  })

  it.each([false, true])('never renders cached H2 before active H1 (prepared entry: %s)', async (prepared) => {
    const storage = new MemoryCacheStorage()
    installCacheStorage(storage)

    const cachedClient = {
      loadEdition: vi.fn(async (logicalPath: string) =>
        logicalPath === snapshotH2.catalogEdition.editionUrl
          ? snapshotH2.edition
          : snapshotH1.edition,
      ),
      loadLyrics: vi.fn(async () => ({ segments: [] })),
      loadTimeline: vi.fn(async (logicalPath: string) => ({
        audioSourceHash:
          logicalPath === snapshotH2.edition.timelineUrl
            ? snapshotH2.edition.audio.sourceHash
            : snapshotH1.edition.audio.sourceHash,
        sections: [],
        occurrences: [],
      })),
      loadPractice: vi.fn(async () => ({ units: [] })),
      resolveAsset: (logicalPath: string) => absoluteUrl(logicalPath),
    } as unknown as RuntimeClient

    // Model a document that already parsed H2, while another tab completes an
    // H1 download and switches the shared manifest before this route is opened.
    await loadRuntimeSongEditionCore(cachedClient, snapshotH2.catalogEdition)
    await downloadSongRuntime(
      snapshotH1.catalogEdition,
      runtimeClientFor(snapshotH1),
      { fetchImpl: fixtureFetch(snapshotH1) },
    )

    const preparedLoad = prepared ? {
      songId: snapshotH2.catalogEdition.songId,
      editionUrl: snapshotH2.catalogEdition.editionUrl,
      state: {
        status: 'ready' as const,
        core: await loadRuntimeSongEditionCore(cachedClient, snapshotH2.catalogEdition),
      },
    } : undefined
    const renderedCoreHashes: string[] = []
    const { result, unmount } = renderHook(() => {
      const state = useSongEditionCore(
        cachedClient,
        snapshotH2.catalogEdition,
        0,
        preparedLoad,
      )
      if (state.status === 'ready') {
        renderedCoreHashes.push(state.core.edition.contentHash)
      }
      return state
    })

    try {
      await waitFor(() => {
        expect(result.current).toMatchObject({
          status: 'ready',
          core: { edition: { contentHash: HASH_A } },
        })
      })
      expect(renderedCoreHashes).toContain(HASH_A)
      expect(renderedCoreHashes).not.toContain(HASH_B)

      const reopened = await loadRuntimeSongEditionCore(
        cachedClient,
        snapshotH2.catalogEdition,
      )
      expect(reopened.edition.contentHash).toBe(HASH_A)
      expect(cachedClient.loadEdition).toHaveBeenCalledTimes(2)
    } finally {
      unmount()
    }
  })

  it('distinguishes an offline song that was never downloaded', async () => {
    const storage = new MemoryCacheStorage()
    installCacheStorage(storage)
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))

    await expect(
      fetchWithSongDownloadFallback(
        absoluteUrl(snapshotH1.catalogEdition.editionUrl),
      ),
    ).rejects.toSatisfy((error: unknown) =>
      error instanceof SongDownloadFetchError &&
      error.kind === 'offline-not-downloaded',
    )
  })
})

interface SnapshotFixtures {
  catalogEdition: CatalogEdition
  edition: RuntimeEdition
}

function createSnapshotFixtures(
  suffix: string,
  contentHash: string,
  separateCatalogCover = true,
): SnapshotFixtures {
  const resourceHash = suffix === 'a'
    ? {
        cover: HASH_B,
        catalogCover: HASH_F,
        lyrics: HASH_C,
        timeline: HASH_D,
        practice: HASH_E,
        feature: HASH_F,
        audio: HASH_B,
      }
    : {
        cover: HASH_C,
        catalogCover: HASH_A,
        lyrics: HASH_D,
        timeline: HASH_E,
        practice: HASH_F,
        feature: HASH_C,
        audio: HASH_D,
      }
  const base = '/library-runtime/songs/first-light'
  const coverSmallUrl = `${base}/cover-small.${resourceHash.cover}.webp`
  const catalogCoverUrl = `${base}/cover-small.${separateCatalogCover ? resourceHash.catalogCover : resourceHash.cover}.webp`
  const catalogEdition: CatalogEdition = {
    songId: 'first-light',
    title: `First Light ${suffix.toUpperCase()}`,
    artist: 'A Composer',
    coverUrl: catalogCoverUrl,
    editionUrl: `${base}/edition.${contentHash}.json`,
  }
  const edition: RuntimeEdition = {
    contractVersion: 3,
    contentHash,
    song: {
      songId: 'first-light',
      title: catalogEdition.title,
      artist: catalogEdition.artist,
    },
    lyricsUrl: `${base}/lyrics.${resourceHash.lyrics}.json`,
    timelineUrl: `${base}/timeline.${resourceHash.timeline}.json`,
    practiceUrl: `${base}/practice.${resourceHash.practice}.json`,
    features: [
      {
        id: 'note',
        url: `${base}/features/note-${suffix}.${resourceHash.feature}.md`,
      },
    ],
    audio: {
      url: `${base}/audio.${resourceHash.audio}.m4a`,
      sourceHash: HASH_E,
      runtimeHash: resourceHash.audio,
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
      coverSmallUrl,
      coverLargeUrl: `${base}/cover-large.${resourceHash.cover}.webp`,
    },
  }
  return { catalogEdition, edition }
}

function runtimeClientFor(fixtures: SnapshotFixtures): RuntimeClient {
  return {
    loadEdition: vi.fn(async (logicalPath: string) => {
      expect(logicalPath).toBe(fixtures.catalogEdition.editionUrl)
      return fixtures.edition
    }),
    resolveAsset: (logicalPath: string) => absoluteUrl(logicalPath),
  } as unknown as RuntimeClient
}

function fixtureFetch(fixtures: SnapshotFixtures) {
  return vi.fn<typeof fetch>(async (input) => {
    const logicalPath = runtimePath(String(input))
    return responseForLogicalPath(logicalPath, fixtures)
  })
}

function responseForLogicalPath(
  logicalPath: string,
  fixtures: SnapshotFixtures,
): Response {
  const { catalogEdition, edition } = fixtures
  if (logicalPath === catalogEdition.editionUrl) {
    return jsonResponse(edition)
  }
  if (logicalPath === edition.lyricsUrl) {
    return jsonResponse({ segments: [] })
  }
  if (logicalPath === edition.timelineUrl) {
    return jsonResponse({
      audioSourceHash: edition.audio.sourceHash,
      sections: [],
      occurrences: [],
    })
  }
  if (logicalPath === edition.practiceUrl) {
    return jsonResponse({ units: [] })
  }
  if (edition.features.some((feature) => feature.url === logicalPath)) {
    return new Response('# Feature\n', { status: 200 })
  }
  if (
    logicalPath === catalogEdition.coverUrl ||
    logicalPath === edition.artwork.coverSmallUrl ||
    logicalPath === edition.artwork.coverLargeUrl ||
    logicalPath === edition.audio.url
  ) {
    return new Response(new Uint8Array([1, 2, 3]), { status: 200 })
  }
  throw new Error(`Unexpected fixture resource: ${logicalPath}`)
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function runtimePath(url: string): string {
  const pathname = new URL(url).pathname
  return pathname.slice(pathname.indexOf('/library-runtime/'))
}

function absoluteUrl(logicalPath: string): string {
  return `https://example.test/red-repeat${logicalPath}`
}

function manifestUrl(songId: string): string {
  return new URL(
    `/.red-repeat/song-downloads/${songId}.json`,
    window.location.origin,
  ).toString()
}

async function readManifest(
  cache: MemoryCache,
  songId: string,
): Promise<unknown> {
  return await (await cache.match(manifestUrl(songId)))?.json()
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
    return this.entries.get(cacheKey(request))?.clone()
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
  const raw = typeof request === 'string'
    ? request
    : request instanceof URL
      ? request.toString()
      : request.url
  return new URL(raw, window.location.origin).toString()
}
