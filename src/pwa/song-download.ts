import type {
  CatalogEdition,
  RuntimeEdition,
} from '../library/runtime-schema'
import type { RuntimeClient } from '../runtime/runtime-client'
import { RUNTIME_CACHE_NAMES } from './cache-routes'

export const SONG_DOWNLOAD_CACHE_NAME = 'red-repeat-song-download-v1'

export type SongDownloadStatus =
  | 'not-installed'
  | 'installing'
  | 'installed'
  | 'failed'

export interface SongDownloadState {
  songId: string
  status: SongDownloadStatus
  lastUpdatedAt?: number
  errorMessage?: string
}

export interface SongDownloadOptions {
  fetchImpl?: typeof fetch
  signal?: AbortSignal
  now?: () => number
}

interface SongDownloadManifest {
  schemaVersion: 1
  songId: string
  contentHash: string
  urls: string[]
  installedAt: number
}

export async function readSongDownloadState(
  songId: string,
): Promise<SongDownloadState> {
  const storage = getCacheStorage()
  if (!storage) {
    return notInstalledState(songId)
  }

  try {
    const cache = await storage.open(SONG_DOWNLOAD_CACHE_NAME)
    const manifestResponse = await cache.match(manifestUrl(songId))
    if (!manifestResponse) {
      return notInstalledState(songId)
    }

    const manifest = await readManifest(manifestResponse, songId)
    if (!manifest) {
      await cache.delete(manifestUrl(songId))
      return notInstalledState(songId)
    }

    const resourceResponses = await Promise.all(
      manifest.urls.map((url) => cache.match(url)),
    )
    if (resourceResponses.some((response) => !response)) {
      await cache.delete(manifestUrl(songId))
      return notInstalledState(songId)
    }

    return {
      songId,
      status: 'installed',
      lastUpdatedAt: manifest.installedAt,
    }
  } catch {
    return notInstalledState(songId)
  }
}

export async function downloadSongRuntime(
  catalogEdition: CatalogEdition,
  runtimeClient: RuntimeClient,
  options: SongDownloadOptions = {},
): Promise<SongDownloadState> {
  const storage = getCacheStorage()
  if (!storage) {
    throw new Error('Cache Storage is unavailable in this browser.')
  }

  const cache = await storage.open(SONG_DOWNLOAD_CACHE_NAME)
  const cachedUrls: string[] = []

  try {
    const edition = await runtimeClient.loadEdition(catalogEdition.editionUrl, {
      signal: options.signal,
    })
    const urls = collectSongRuntimeUrls(catalogEdition, edition, runtimeClient)
    const fetchImpl = options.fetchImpl ?? fetchWithSongDownloadFallback

    for (const url of urls) {
      const response = await fetchImpl(url, {
        method: 'GET',
        credentials: 'same-origin',
        signal: options.signal,
      })
      if (!response.ok) {
        throw new Error(`Song resource returned HTTP ${response.status}.`)
      }
      if (!(await matchDownloadedAsset(url))) {
        await cache.put(url, response.clone())
        cachedUrls.push(url)
      }
    }

    const installedAt = options.now?.() ?? Date.now()
    const manifest: SongDownloadManifest = {
      schemaVersion: 1,
      songId: catalogEdition.songId,
      contentHash: edition.contentHash,
      urls,
      installedAt,
    }
    await cache.put(
      manifestUrl(catalogEdition.songId),
      new Response(JSON.stringify(manifest), {
        headers: { 'content-type': 'application/json' },
      }),
    )

    return {
      songId: catalogEdition.songId,
      status: 'installed',
      lastUpdatedAt: installedAt,
    }
  } catch (error) {
    await deleteSongResources(cache, cachedUrls)
    throw error
  }
}

export async function removeSongRuntime(songId: string): Promise<void> {
  const storage = getCacheStorage()
  if (!storage) {
    return
  }

  const downloadCache = await storage.open(SONG_DOWNLOAD_CACHE_NAME)
  const manifestResponse = await downloadCache.match(manifestUrl(songId))
  const manifest = manifestResponse
    ? await readManifest(manifestResponse, songId)
    : undefined
  const urls = manifest?.urls ?? (await findSongResourceUrls(downloadCache, songId))

  await deleteSongResources(downloadCache, urls)
  await downloadCache.delete(manifestUrl(songId))
  await deleteRuntimeCacheEntries(urls)
}

export async function fetchWithSongDownloadFallback(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await globalThis.fetch(input, init)
  } catch (error) {
    if (init?.signal?.aborted) {
      throw error
    }

    const cachedResponse = await matchDownloadedAsset(input)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

export function collectSongRuntimeUrls(
  catalogEdition: CatalogEdition,
  edition: RuntimeEdition,
  runtimeClient: RuntimeClient,
): string[] {
  const logicalPaths = [
    catalogEdition.editionUrl,
    catalogEdition.coverUrl,
    edition.lyricsUrl,
    edition.timelineUrl,
    edition.practiceUrl,
    edition.visualUrl,
    ...edition.features.map((feature) => feature.url),
    edition.artwork.coverSmallUrl,
    edition.artwork.coverLargeUrl,
    ...(edition.artwork.heroLargeUrl ? [edition.artwork.heroLargeUrl] : []),
    edition.audio.url,
  ]

  return [...new Set(logicalPaths.map((logicalPath) => runtimeClient.resolveAsset(logicalPath)))]
}

function getCacheStorage(): CacheStorage | undefined {
  return typeof caches === 'undefined' ? undefined : caches
}

function notInstalledState(songId: string): SongDownloadState {
  return { songId, status: 'not-installed' }
}

function manifestUrl(songId: string): string {
  const origin =
    typeof location === 'undefined' ? 'http://localhost' : location.origin
  return new URL(
    `/.red-repeat/song-downloads/${encodeURIComponent(songId)}.json`,
    origin,
  ).toString()
}

async function readManifest(
  response: Response,
  songId: string,
): Promise<SongDownloadManifest | undefined> {
  try {
    const payload: unknown = await response.json()
    if (!isSongDownloadManifest(payload) || payload.songId !== songId) {
      return undefined
    }
    return payload
  } catch {
    return undefined
  }
}

function isSongDownloadManifest(
  payload: unknown,
): payload is SongDownloadManifest {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const candidate = payload as Record<string, unknown>
  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.songId === 'string' &&
    typeof candidate.contentHash === 'string' &&
    Array.isArray(candidate.urls) &&
    candidate.urls.every((url) => typeof url === 'string') &&
    typeof candidate.installedAt === 'number'
  )
}

async function deleteSongResources(
  cache: Cache,
  urls: readonly string[],
): Promise<void> {
  await Promise.all(urls.map((url) => cache.delete(url)))
}

async function findSongResourceUrls(
  cache: Cache,
  songId: string,
): Promise<string[]> {
  const keys = await cache.keys()
  const marker = `/${encodeURIComponent(songId)}/`
  return keys
    .map((request) => request.url)
    .filter((url) => url.includes(`/library-runtime/songs/${songId}/`) || url.includes(marker))
}

async function deleteRuntimeCacheEntries(urls: readonly string[]): Promise<void> {
  const storage = getCacheStorage()
  if (!storage || urls.length === 0) {
    return
  }

  await Promise.all(
    [RUNTIME_CACHE_NAMES.runtime, RUNTIME_CACHE_NAMES.audio].map(
      async (cacheName) => {
        try {
          const cache = await storage.open(cacheName)
          await Promise.all(urls.map((url) => cache.delete(url)))
        } catch {
          // A missing optional Workbox cache should not block removal.
        }
      },
    ),
  )
}

async function matchDownloadedAsset(
  input: RequestInfo | URL,
): Promise<Response | undefined> {
  const storage = getCacheStorage()
  if (!storage) {
    return undefined
  }

  try {
    const cache = await storage.open(SONG_DOWNLOAD_CACHE_NAME)
    const customResponse = await cache.match(input)
    if (customResponse) {
      return customResponse
    }
    return await storage.match(input)
  } catch {
    return undefined
  }
}
