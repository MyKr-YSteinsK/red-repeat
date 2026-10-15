import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type {
  LyricsDocument,
  PracticeDocument,
  TimelineDocument,
} from '../library/schema'
import {
  RuntimeClientError,
  type RuntimeClient,
  type RuntimeLoadOptions,
} from './runtime-client'
import { assembleRuntimeSongEdition, type AssembledSongEdition } from './song-edition'
import {
  clearLegacyTimingOverrides,
  createEffectiveOccurrenceTimingProvider,
  preserveLegacyTimingOverrides,
  readTimingOverrides,
  type TimingOverrideIdentity,
} from '../practice/practice-timing-overrides'
import type { OccurrenceTimingProvider } from '../timeline/occurrence-timing'
import { readDownloadedSongSnapshot } from '../pwa/song-download'

export interface RuntimeSongEditionCore {
  catalogEdition: CatalogEdition
  edition: RuntimeEdition
  lyrics: LyricsDocument
  timeline: TimelineDocument
  practice: PracticeDocument
  timingProvider: OccurrenceTimingProvider
  assembled: AssembledSongEdition
}

const MAX_CACHED_SONG_EDITIONS = 12
const cachedSongEditionsByClient = new WeakMap<
  RuntimeClient,
  Map<string, RuntimeSongEditionCore>
>()

// This is a navigation hint, never an identity decision or a renderable core.
// A warm entry still resolves the active downloaded manifest asynchronously.
export function hasWarmSongEditionCore(client: RuntimeClient, songId: string): boolean {
  return [...(cachedSongEditionsByClient.get(client)?.values() ?? [])].some(
    (core) => core.catalogEdition.songId === songId,
  )
}

export async function loadRuntimeSongEditionCore(
  client: RuntimeClient,
  catalogEdition: CatalogEdition,
  options: RuntimeLoadOptions = {},
): Promise<RuntimeSongEditionCore> {
  // The downloaded manifest selects the effective edition; consult it before
  // reusing a core so a warm Catalog cache cannot outrank an active H1 snapshot.
  const downloadedSnapshot = await readDownloadedSongSnapshot(
    catalogEdition.songId,
  )
  const effectiveCatalogEdition =
    downloadedSnapshot?.catalogEdition ?? catalogEdition
  if (options.signal?.aborted) {
    throw new RuntimeClientError({
      kind: 'abort',
      logicalPath: effectiveCatalogEdition.editionUrl,
      url: effectiveCatalogEdition.editionUrl,
      message: 'Song Edition entry was cancelled before core selection.',
    })
  }
  const cachedCore = getCachedSongEditionCore(
    client,
    effectiveCatalogEdition,
  )
  if (cachedCore) {
    return refreshCoreTimingProvider(cachedCore)
  }

  const edition = await client.loadEdition(
    effectiveCatalogEdition.editionUrl,
    options,
  )
  const [lyrics, timeline, practice] = await Promise.all([
    client.loadLyrics(edition.lyricsUrl, options),
    client.loadTimeline(edition.timelineUrl, options),
    client.loadPractice(edition.practiceUrl, options),
  ])

  const timingIdentity: TimingOverrideIdentity = {
    songId: edition.song.songId,
    editionContentHash: edition.contentHash,
    audioSourceHash: edition.audio.sourceHash,
    baseTimelineUrl: edition.timelineUrl,
  }
  await preserveLegacyTimingOverrides(timingIdentity.songId)
  const storedTiming = readTimingOverrides(timingIdentity, {
    occurrences: timeline.occurrences,
  })
  if (storedTiming.kind === 'invalid' && storedTiming.source === 'legacy') {
    clearLegacyTimingOverrides(timingIdentity.songId)
  }
  const timingProvider = createEffectiveOccurrenceTimingProvider(
    timeline,
    storedTiming.kind === 'compatible' ? storedTiming.document : undefined,
  )

  const core = {
    catalogEdition: effectiveCatalogEdition,
    edition,
    lyrics,
    timeline,
    practice,
    timingProvider,
  }
  const loadedCore: RuntimeSongEditionCore = {
    ...core,
    assembled: assembleRuntimeSongEdition({
      ...core,
      timingProvider,
      features: [],
      allowMissingFeatureContent: true,
    }),
  }
  cacheSongEditionCore(client, loadedCore)
  return loadedCore
}

function getCachedSongEditionCore(
  client: RuntimeClient,
  catalogEdition: CatalogEdition,
): RuntimeSongEditionCore | undefined {
  const cache = cachedSongEditionsByClient.get(client)
  if (!cache) {
    return undefined
  }

  const key = getSongEditionCacheKey(
    catalogEdition.songId,
    catalogEdition.editionUrl,
  )
  const core = cache.get(key)
  if (
    !core ||
    !hasMatchingEditionContentUrl(
      core.catalogEdition.editionUrl,
      core.edition.contentHash,
    )
  ) {
    return undefined
  }

  cache.delete(key)
  cache.set(key, core)
  return core
}

function cacheSongEditionCore(
  client: RuntimeClient,
  core: RuntimeSongEditionCore,
): void {
  if (!hasMatchingEditionContentUrl(core.catalogEdition.editionUrl, core.edition.contentHash)) {
    return
  }
  let cache = cachedSongEditionsByClient.get(client)
  if (!cache) {
    cache = new Map()
    cachedSongEditionsByClient.set(client, cache)
  }

  const key = getSongEditionCacheKey(
    core.catalogEdition.songId,
    core.catalogEdition.editionUrl,
  )
  cache.delete(key)
  cache.set(key, core)
  while (cache.size > MAX_CACHED_SONG_EDITIONS) {
    const oldestKey = cache.keys().next().value
    if (oldestKey === undefined) {
      return
    }
    cache.delete(oldestKey)
  }
}

function getSongEditionCacheKey(songId: string, editionUrl: string): string {
  return `${songId}\u0000${editionUrl}`
}

function hasMatchingEditionContentUrl(
  editionUrl: string,
  contentHash: string,
): boolean {
  const path = editionUrl.split(/[?#]/, 1)[0] ?? editionUrl
  return path.endsWith(`.${contentHash}.json`)
}

async function refreshCoreTimingProvider(
  core: RuntimeSongEditionCore,
): Promise<RuntimeSongEditionCore> {
  const identity: TimingOverrideIdentity = {
    songId: core.edition.song.songId,
    editionContentHash: core.edition.contentHash,
    audioSourceHash: core.edition.audio.sourceHash,
    baseTimelineUrl: core.edition.timelineUrl,
  }
  await preserveLegacyTimingOverrides(identity.songId)
  const storedTiming = readTimingOverrides(identity, {
    occurrences: core.timeline.occurrences,
  })
  if (storedTiming.kind === 'invalid' && storedTiming.source === 'legacy') {
    clearLegacyTimingOverrides(identity.songId)
  }
  const timingProvider = createEffectiveOccurrenceTimingProvider(
    core.timeline,
    storedTiming.kind === 'compatible' ? storedTiming.document : undefined,
  )

  return {
    ...core,
    timingProvider,
    assembled: assembleRuntimeSongEdition({
      catalogEdition: core.catalogEdition,
      edition: core.edition,
      lyrics: core.lyrics,
      timeline: core.timeline,
      practice: core.practice,
      timingProvider,
      features: [],
      allowMissingFeatureContent: true,
    }),
  }
}
