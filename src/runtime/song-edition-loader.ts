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
import {
  assembleRuntimeSongEdition,
  type AssembledSongEdition,
  type RuntimeFeatureContent,
} from './song-edition'
import {
  clearTimingOverrides,
  createEffectiveOccurrenceTimingProvider,
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
  features: readonly RuntimeFeatureContent[]
  featureErrors: readonly RuntimeFeatureLoadError[]
  assembled: AssembledSongEdition
}

export interface RuntimeFeatureLoadError {
  descriptor: RuntimeEdition['features'][number]
  error: unknown
}

export async function loadRuntimeSongEditionCore(
  client: RuntimeClient,
  catalogEdition: CatalogEdition,
  options: RuntimeLoadOptions = {},
): Promise<RuntimeSongEditionCore> {
  const downloadedSnapshot = await readDownloadedSongSnapshot(
    catalogEdition.songId,
  )
  const effectiveCatalogEdition =
    downloadedSnapshot?.catalogEdition ?? catalogEdition
  const edition = await client.loadEdition(
    effectiveCatalogEdition.editionUrl,
    options,
  )
  const [lyrics, timeline, practice] = await Promise.all([
    client.loadLyrics(edition.lyricsUrl, options),
    client.loadTimeline(edition.timelineUrl, options),
    client.loadPractice(edition.practiceUrl, options),
  ])
  const featureResults = await Promise.all(
    edition.features.map(async (descriptor) => ({
      descriptor,
      result: await loadFeatureSafely(client, descriptor, options),
    })),
  )
  const features = featureResults.flatMap(({ descriptor, result }) =>
    result.status === 'ok' ? [{ descriptor, content: result.content }] : [],
  )
  const featureErrors = featureResults.flatMap(({ descriptor, result }) =>
    result.status === 'error'
      ? [{ descriptor, error: result.error }]
      : [],
  )

  const timingIdentity: TimingOverrideIdentity = {
    songId: edition.song.songId,
    editionContentHash: edition.contentHash,
    audioSourceHash: edition.audio.sourceHash,
    baseTimelineUrl: edition.timelineUrl,
  }
  const storedTiming = readTimingOverrides(timingIdentity, {
    occurrences: timeline.occurrences,
  })
  if (storedTiming.kind !== 'none' && storedTiming.kind !== 'compatible') {
    clearTimingOverrides(timingIdentity)
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
    features,
    featureErrors,
  }
  return {
    ...core,
    assembled: assembleRuntimeSongEdition({
      ...core,
      timingProvider,
      allowMissingFeatureContent: true,
    }),
  }
}

async function loadFeatureSafely(
  client: RuntimeClient,
  descriptor: RuntimeEdition['features'][number],
  options: RuntimeLoadOptions,
): Promise<
  | { status: 'ok'; content: string }
  | { status: 'error'; error: unknown }
> {
  try {
    return {
      status: 'ok',
      content: await client.loadFeature(descriptor, options),
    }
  } catch (error) {
    if (error instanceof RuntimeClientError && error.kind === 'abort') {
      throw error
    }
    return { status: 'error', error }
  }
}
