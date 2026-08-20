import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type {
  LyricsDocument,
  PracticeDocument,
  TimelineDocument,
  VisualDocument,
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

export interface RuntimeSongEditionCore {
  catalogEdition: CatalogEdition
  edition: RuntimeEdition
  lyrics: LyricsDocument
  timeline: TimelineDocument
  practice: PracticeDocument
  visual: VisualDocument
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
  const edition = await client.loadEdition(catalogEdition.editionUrl, options)
  const [lyrics, timeline, practice, visual] = await Promise.all([
    client.loadLyrics(edition.lyricsUrl, options),
    client.loadTimeline(edition.timelineUrl, options),
    client.loadPractice(edition.practiceUrl, options),
    client.loadVisual(edition.visualUrl, options),
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

  const core = {
    catalogEdition,
    edition,
    lyrics,
    timeline,
    practice,
    visual,
    features,
    featureErrors,
  }
  return {
    ...core,
    assembled: assembleRuntimeSongEdition({
      ...core,
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
