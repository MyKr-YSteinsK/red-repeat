import {
  CatalogEditionSchema,
  RuntimeEditionSchema,
  type CatalogEdition,
  type RuntimeEdition,
} from '../library/runtime-schema'
import {
  LyricsSchema,
  PracticeSchema,
  TimelineSchema,
} from '../library/schema'
import type { RuntimeClient } from '../runtime/runtime-client'
import {
  LEGACY_RUNTIME_CACHE_NAMES,
  RUNTIME_CACHE_NAMES,
} from './cache-routes'

export const SONG_DOWNLOAD_CACHE_NAME = RUNTIME_CACHE_NAMES.snapshot

export type SongDownloadStatus =
  | 'not-installed'
  | 'installing'
  | 'installed'
  | 'failed'

export type SongDownloadFailureKind = 'incomplete' | 'invalid'

export interface SongDownloadState {
  songId: string
  status: SongDownloadStatus
  lastUpdatedAt?: number
  contentHash?: string
  editionUrl?: string
  snapshotEdition?: CatalogEdition
  failureKind?: SongDownloadFailureKind
  errorMessage?: string
}

export interface DownloadedSongSnapshot {
  songId: string
  contentHash: string
  catalogEdition: CatalogEdition
  urls: readonly string[]
  installedAt: number
}

export interface SongDownloadOptions {
  fetchImpl?: typeof fetch
  signal?: AbortSignal
  now?: () => number
}

export class SongDownloadFetchError extends Error {
  readonly kind: 'offline-not-downloaded' | 'download-incomplete'

  constructor(
    kind: SongDownloadFetchError['kind'],
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause })
    this.name = 'SongDownloadFetchError'
    this.kind = kind
  }
}

interface SongDownloadManifestV1 {
  schemaVersion: 1
  songId: string
  contentHash: string
  urls: string[]
  installedAt: number
}

interface SongDownloadManifestV2 {
  schemaVersion: 2
  songId: string
  contentHash: string
  catalogEdition: CatalogEdition
  urls: string[]
  installedAt: number
}

type SnapshotInspection =
  | { kind: 'not-installed' }
  | { kind: 'installed'; snapshot: DownloadedSongSnapshot }
  | {
      kind: 'incomplete'
      failureKind: SongDownloadFailureKind
      message: string
    }

interface LocalAssetLookup {
  response?: Response
  inspection: SnapshotInspection
}

const CONTENT_HASH_PATTERN = /^[a-f0-9]{64}$/
const validatedSnapshots = new Map<
  string,
  { signature: string; snapshot: DownloadedSongSnapshot }
>()

export async function readSongDownloadState(
  songId: string,
): Promise<SongDownloadState> {
  const storage = getCacheStorage()
  if (!storage) {
    return notInstalledState(songId)
  }

  try {
    const cache = await storage.open(SONG_DOWNLOAD_CACHE_NAME)
    const inspection = await inspectSongDownload(cache, songId, true)
    if (inspection.kind === 'installed') {
      return stateFromSnapshot(inspection.snapshot)
    }
    if (inspection.kind === 'incomplete') {
      return {
        songId,
        status: 'failed',
        failureKind: inspection.failureKind,
        errorMessage: inspection.message,
      }
    }
    return notInstalledState(songId)
  } catch {
    return {
      songId,
      status: 'failed',
      failureKind: 'invalid',
      errorMessage: '本地下载记录无法读取，请联网后重新下载。',
    }
  }
}

export async function readDownloadedSongSnapshot(
  songId: string,
): Promise<DownloadedSongSnapshot | undefined> {
  const storage = getCacheStorage()
  if (!storage) {
    return undefined
  }

  try {
    const cache = await storage.open(SONG_DOWNLOAD_CACHE_NAME)
    const inspection = await inspectSongDownload(cache, songId)
    return inspection.kind === 'installed' ? inspection.snapshot : undefined
  } catch {
    return undefined
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
  const preexistingSongUrls = new Set(
    (await findSongResourceUrls(cache, catalogEdition.songId)).map(
      normalizeRequestUrl,
    ),
  )

  try {
    const edition = await runtimeClient.loadEdition(catalogEdition.editionUrl, {
      signal: options.signal,
    })
    assertEditionIdentity(catalogEdition, edition)

    const urls = collectSongRuntimeUrls(catalogEdition, edition, runtimeClient)
    const fetchImpl = options.fetchImpl ?? fetchWithSongDownloadFallback

    for (const url of urls) {
      const logicalPath = runtimeLogicalPathFromUrl(url)
      if (!logicalPath) {
        throw new Error(`Song resource is outside /library-runtime/: ${url}`)
      }

      let response = await cache.match(url)
      if (
        !response ||
        !(await isValidResourceResponse(
          response,
          logicalPath,
          catalogEdition,
          edition,
        ))
      ) {
        response = await fetchImpl(url, {
          method: 'GET',
          credentials: 'same-origin',
          signal: options.signal,
        })
        await assertResourceResponse(
          response,
          logicalPath,
          catalogEdition,
          edition,
        )
        await cache.put(url, response.clone())
      }
    }

    const installedAt = options.now?.() ?? Date.now()
    const manifest: SongDownloadManifestV2 = {
      schemaVersion: 2,
      songId: catalogEdition.songId,
      contentHash: edition.contentHash,
      catalogEdition,
      urls,
      installedAt,
    }
    const snapshot = await validateManifestSnapshot(cache, manifest)
    await cache.put(
      manifestUrl(catalogEdition.songId),
      createManifestResponse(manifest),
    )
    validatedSnapshots.set(catalogEdition.songId, {
      signature: manifestSignature(manifest),
      snapshot,
    })

    return stateFromSnapshot(snapshot)
  } catch (error) {
    const partialUrls = (
      await findSongResourceUrls(cache, catalogEdition.songId)
    ).filter((url) => !preexistingSongUrls.has(normalizeRequestUrl(url)))
    await deleteSongResources(cache, partialUrls)
    throw error
  }
}

export async function removeSongRuntime(songId: string): Promise<void> {
  const storage = getCacheStorage()
  if (!storage) {
    return
  }

  const snapshotCache = await storage.open(SONG_DOWNLOAD_CACHE_NAME)
  const manifestUrls = await readManifestUrlsBestEffort(snapshotCache, songId)
  const ownedSnapshotUrls = await findSongResourceUrls(snapshotCache, songId)
  await deleteSongResources(
    snapshotCache,
    [...new Set([...manifestUrls, ...ownedSnapshotUrls])],
  )
  await snapshotCache.delete(manifestUrl(songId))
  validatedSnapshots.delete(songId)

  await Promise.all(
    LEGACY_RUNTIME_CACHE_NAMES.map(async (cacheName) => {
      try {
        const cache = await storage.open(cacheName)
        await deleteSongResources(
          cache,
          await findSongResourceUrls(cache, songId),
        )
      } catch {
        // Missing legacy caches do not own the current snapshot state.
      }
    }),
  )
}

export async function fetchWithSongDownloadFallback(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const localLookup = await lookupDownloadedAsset(input)
  if (localLookup.response) {
    return localLookup.response
  }

  try {
    return await globalThis.fetch(input, init)
  } catch (error) {
    if (init?.signal?.aborted) {
      throw error
    }

    const songId = songIdFromRuntimeUrl(input)
    if (!songId) {
      throw error
    }
    if (localLookup.inspection.kind === 'incomplete') {
      throw new SongDownloadFetchError(
        'download-incomplete',
        `Downloaded snapshot for ${songId} is incomplete.`,
        error,
      )
    }
    throw new SongDownloadFetchError(
      'offline-not-downloaded',
      `The requested runtime version for ${songId} is not downloaded.`,
      error,
    )
  }
}

export function collectSongRuntimeUrls(
  catalogEdition: CatalogEdition,
  edition: RuntimeEdition,
  runtimeClient: RuntimeClient,
): string[] {
  return collectSongRuntimeLogicalPaths(catalogEdition, edition).map(
    (logicalPath) => runtimeClient.resolveAsset(logicalPath),
  )
}

export function collectSongRuntimeLogicalPaths(
  catalogEdition: CatalogEdition,
  edition: RuntimeEdition,
): string[] {
  const logicalPaths = [
    catalogEdition.editionUrl,
    catalogEdition.coverUrl,
    edition.lyricsUrl,
    edition.timelineUrl,
    edition.practiceUrl,
    ...edition.features.map((feature) => feature.url),
    edition.artwork.coverSmallUrl,
    edition.artwork.coverLargeUrl,
    ...(edition.artwork.heroLargeUrl ? [edition.artwork.heroLargeUrl] : []),
    edition.audio.url,
  ]

  return [...new Set(logicalPaths)]
}

function getCacheStorage(): CacheStorage | undefined {
  return typeof caches === 'undefined' ? undefined : caches
}

function notInstalledState(songId: string): SongDownloadState {
  return { songId, status: 'not-installed' }
}

function stateFromSnapshot(
  snapshot: DownloadedSongSnapshot,
): SongDownloadState {
  return {
    songId: snapshot.songId,
    status: 'installed',
    lastUpdatedAt: snapshot.installedAt,
    contentHash: snapshot.contentHash,
    editionUrl: snapshot.catalogEdition.editionUrl,
    snapshotEdition: snapshot.catalogEdition,
  }
}

function manifestUrl(songId: string): string {
  const origin =
    typeof location === 'undefined' ? 'http://localhost' : location.origin
  return new URL(
    `/.red-repeat/song-downloads/${encodeURIComponent(songId)}.json`,
    origin,
  ).toString()
}

async function inspectSongDownload(
  cache: Cache,
  songId: string,
  forceValidation = false,
): Promise<SnapshotInspection> {
  const response = await cache.match(manifestUrl(songId))
  if (!response) {
    return { kind: 'not-installed' }
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return incompleteInspection('invalid')
  }

  try {
    if (isSongDownloadManifestV2(payload) && payload.songId === songId) {
      const signature = manifestSignature(payload)
      const validated = validatedSnapshots.get(songId)
      if (!forceValidation && validated?.signature === signature) {
        return {
          kind: 'installed',
          snapshot: validated.snapshot,
        }
      }
      const snapshot = await validateManifestSnapshot(cache, payload)
      validatedSnapshots.set(songId, { signature, snapshot })
      return {
        kind: 'installed',
        snapshot,
      }
    }
    if (isSongDownloadManifestV1(payload) && payload.songId === songId) {
      const migrated = await migrateManifestV1(cache, payload)
      await cache.put(manifestUrl(songId), createManifestResponse(migrated))
      const snapshot = await validateManifestSnapshot(cache, migrated)
      validatedSnapshots.set(songId, {
        signature: manifestSignature(migrated),
        snapshot,
      })
      return {
        kind: 'installed',
        snapshot,
      }
    }
    validatedSnapshots.delete(songId)
    return incompleteInspection('invalid')
  } catch {
    validatedSnapshots.delete(songId)
    return incompleteInspection('incomplete')
  }
}

async function migrateManifestV1(
  cache: Cache,
  manifest: SongDownloadManifestV1,
): Promise<SongDownloadManifestV2> {
  const resourceResponses = await matchManifestResources(cache, manifest.urls)
  const editionIndex = manifest.urls.findIndex((url) => {
    const path = runtimeLogicalPathFromUrl(url)
    return Boolean(path && /\/edition\.[a-f0-9]{64}\.json$/.test(path))
  })
  if (editionIndex < 0) {
    throw new Error('Legacy snapshot does not identify an Edition resource.')
  }

  const edition = RuntimeEditionSchema.parse(
    await resourceResponses[editionIndex].clone().json(),
  )
  if (
    edition.song.songId !== manifest.songId ||
    edition.contentHash !== manifest.contentHash
  ) {
    throw new Error('Legacy snapshot identity does not match its Edition.')
  }

  const editionUrl = runtimeLogicalPathFromUrl(manifest.urls[editionIndex])
  if (!editionUrl) {
    throw new Error('Legacy Edition URL is invalid.')
  }
  const catalogEdition = CatalogEditionSchema.parse({
    songId: edition.song.songId,
    title: edition.song.title,
    artist: edition.song.artist,
    ...(edition.song.album ? { album: edition.song.album } : {}),
    ...(edition.song.year !== undefined ? { year: edition.song.year } : {}),
    coverUrl: edition.artwork.coverSmallUrl,
    editionUrl,
  })

  const migrated: SongDownloadManifestV2 = {
    schemaVersion: 2,
    songId: manifest.songId,
    contentHash: manifest.contentHash,
    catalogEdition,
    urls: manifest.urls,
    installedAt: manifest.installedAt,
  }
  await validateManifestSnapshot(cache, migrated)
  return migrated
}

async function validateManifestSnapshot(
  cache: Cache,
  manifest: SongDownloadManifestV2,
): Promise<DownloadedSongSnapshot> {
  const catalogEdition = CatalogEditionSchema.parse(manifest.catalogEdition)
  if (
    manifest.songId !== catalogEdition.songId ||
    !CONTENT_HASH_PATTERN.test(manifest.contentHash) ||
    manifest.urls.length === 0 ||
    new Set(manifest.urls.map(normalizeRequestUrl)).size !== manifest.urls.length
  ) {
    throw new Error('Snapshot manifest identity is invalid.')
  }

  const responses = await matchManifestResources(cache, manifest.urls)
  const actualPaths = manifest.urls.map(runtimeLogicalPathFromUrl)
  if (actualPaths.some((path) => !path)) {
    throw new Error('Snapshot contains a non-runtime resource URL.')
  }

  const editionIndex = actualPaths.indexOf(catalogEdition.editionUrl)
  if (editionIndex < 0) {
    throw new Error('Snapshot does not contain its Edition resource.')
  }
  const edition = RuntimeEditionSchema.parse(
    await responses[editionIndex].clone().json(),
  )
  assertEditionIdentity(catalogEdition, edition)
  if (edition.contentHash !== manifest.contentHash) {
    throw new Error('Snapshot contentHash does not match its Edition.')
  }

  const expectedPaths = collectSongRuntimeLogicalPaths(catalogEdition, edition)
  if (!sameStringSet(actualPaths as string[], expectedPaths)) {
    throw new Error('Snapshot resource set does not match its Edition identity.')
  }

  await Promise.all(
    responses.map((response, index) =>
      assertResourceResponse(
        response,
        actualPaths[index] as string,
        catalogEdition,
        edition,
      ),
    ),
  )

  return {
    songId: manifest.songId,
    contentHash: manifest.contentHash,
    catalogEdition,
    urls: [...manifest.urls],
    installedAt: manifest.installedAt,
  }
}

async function matchManifestResources(
  cache: Cache,
  urls: readonly string[],
): Promise<Response[]> {
  const responses = await Promise.all(urls.map((url) => cache.match(url)))
  if (responses.some((response) => !response)) {
    throw new Error('Snapshot is missing one or more required resources.')
  }
  return responses as Response[]
}

function assertEditionIdentity(
  catalogEdition: CatalogEdition,
  edition: RuntimeEdition,
): void {
  if (catalogEdition.songId !== edition.song.songId) {
    throw new Error('Catalog and Runtime Edition songId do not match.')
  }
  const editionHash = catalogEdition.editionUrl.match(
    /\/edition\.([a-f0-9]{64})\.json$/,
  )?.[1]
  if (editionHash && editionHash !== edition.contentHash) {
    throw new Error('Catalog Edition URL does not match Runtime contentHash.')
  }
}

async function isValidResourceResponse(
  response: Response,
  logicalPath: string,
  catalogEdition: CatalogEdition,
  edition: RuntimeEdition,
): Promise<boolean> {
  try {
    await assertResourceResponse(
      response,
      logicalPath,
      catalogEdition,
      edition,
    )
    return true
  } catch {
    return false
  }
}

async function assertResourceResponse(
  response: Response,
  logicalPath: string,
  catalogEdition: CatalogEdition,
  edition: RuntimeEdition,
): Promise<void> {
  if (response.status !== 200) {
    throw new Error(`Song resource returned HTTP ${response.status}.`)
  }

  if (logicalPath === catalogEdition.editionUrl) {
    const parsed = RuntimeEditionSchema.parse(await response.clone().json())
    assertEditionIdentity(catalogEdition, parsed)
    if (parsed.contentHash !== edition.contentHash) {
      throw new Error('Downloaded Edition response changed during staging.')
    }
    return
  }
  if (logicalPath === edition.lyricsUrl) {
    LyricsSchema.parse(await response.clone().json())
    return
  }
  if (logicalPath === edition.timelineUrl) {
    TimelineSchema.parse(await response.clone().json())
    return
  }
  if (logicalPath === edition.practiceUrl) {
    PracticeSchema.parse(await response.clone().json())
  }
}

function isSongDownloadManifestV1(
  payload: unknown,
): payload is SongDownloadManifestV1 {
  return isManifestBase(payload, 1)
}

function isSongDownloadManifestV2(
  payload: unknown,
): payload is SongDownloadManifestV2 {
  if (!isManifestBase(payload, 2)) {
    return false
  }
  const candidate = payload as Record<string, unknown>
  return CatalogEditionSchema.safeParse(candidate.catalogEdition).success
}

function isManifestBase(
  payload: unknown,
  schemaVersion: 1 | 2,
): boolean {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const candidate = payload as Record<string, unknown>
  return (
    candidate.schemaVersion === schemaVersion &&
    typeof candidate.songId === 'string' &&
    typeof candidate.contentHash === 'string' &&
    CONTENT_HASH_PATTERN.test(candidate.contentHash) &&
    Array.isArray(candidate.urls) &&
    candidate.urls.every((url) => typeof url === 'string') &&
    typeof candidate.installedAt === 'number' &&
    Number.isFinite(candidate.installedAt)
  )
}

function incompleteInspection(
  failureKind: SongDownloadFailureKind,
): SnapshotInspection {
  return {
    kind: 'incomplete',
    failureKind,
    message: failureKind === 'invalid'
      ? '本地下载记录损坏，请联网后重新下载。'
      : '本地下载不完整，请联网后重新下载。',
  }
}

async function lookupDownloadedAsset(
  input: RequestInfo | URL,
): Promise<LocalAssetLookup> {
  const songId = songIdFromRuntimeUrl(input)
  const storage = getCacheStorage()
  if (!songId || !storage) {
    return {
      inspection: { kind: 'not-installed' },
    }
  }

  try {
    const cache = await storage.open(SONG_DOWNLOAD_CACHE_NAME)
    const inspection = await inspectSongDownload(cache, songId)
    if (inspection.kind !== 'installed') {
      return { inspection }
    }

    const requestedUrl = normalizeRequestUrl(input)
    const storedUrl = inspection.snapshot.urls.find(
      (url) => normalizeRequestUrl(url) === requestedUrl,
    )
    const response = storedUrl ? await cache.match(storedUrl) : undefined
    if (storedUrl && !response) {
      validatedSnapshots.delete(songId)
      return {
        inspection: incompleteInspection('incomplete'),
      }
    }
    return {
      inspection,
      response,
    }
  } catch {
    return {
      inspection: incompleteInspection('invalid'),
    }
  }
}

async function readManifestUrlsBestEffort(
  cache: Cache,
  songId: string,
): Promise<string[]> {
  try {
    const response = await cache.match(manifestUrl(songId))
    if (!response) {
      return []
    }
    const payload = await response.json() as { urls?: unknown }
    return Array.isArray(payload.urls)
      ? payload.urls.filter((url): url is string => typeof url === 'string')
      : []
  } catch {
    return []
  }
}

function createManifestResponse(manifest: SongDownloadManifestV2): Response {
  return new Response(JSON.stringify(manifest), {
    headers: { 'content-type': 'application/json' },
  })
}

function manifestSignature(manifest: SongDownloadManifestV2): string {
  return JSON.stringify([
    manifest.contentHash,
    manifest.installedAt,
    manifest.catalogEdition.editionUrl,
    manifest.urls,
  ])
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
  const marker = `/library-runtime/songs/${encodeURIComponent(songId)}/`
  return keys
    .map((request) => request.url)
    .filter((url) => {
      try {
        return new URL(url).pathname.includes(marker)
      } catch {
        return false
      }
    })
}

function runtimeLogicalPathFromUrl(
  requestUrl: string,
): string | undefined {
  try {
    const pathname = new URL(requestUrl, currentOrigin()).pathname
    const runtimeIndex = pathname.indexOf('/library-runtime/')
    return runtimeIndex >= 0 ? pathname.slice(runtimeIndex) : undefined
  } catch {
    return undefined
  }
}

function songIdFromRuntimeUrl(
  input: RequestInfo | URL,
): string | undefined {
  try {
    const pathname = new URL(normalizeRequestUrl(input)).pathname
    const match = pathname.match(/\/library-runtime\/songs\/([^/]+)\//)
    return match?.[1] ? decodeURIComponent(match[1]) : undefined
  } catch {
    return undefined
  }
}

function normalizeRequestUrl(input: RequestInfo | URL): string {
  const raw = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url
  return new URL(raw, currentOrigin()).toString()
}

function currentOrigin(): string {
  return typeof location === 'undefined' ? 'http://localhost' : location.origin
}

function sameStringSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) {
    return false
  }
  const rightSet = new Set(right)
  return left.every((value) => rightSet.has(value))
}
