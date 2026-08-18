import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type {
  LyricsDocument,
  TimelineDocument,
  VisualDocument,
} from '../library/schema'
import type { RuntimeClient, RuntimeLoadOptions } from './runtime-client'
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
  visual: VisualDocument
  features: readonly RuntimeFeatureContent[]
  assembled: AssembledSongEdition
}

export async function loadRuntimeSongEditionCore(
  client: RuntimeClient,
  catalogEdition: CatalogEdition,
  options: RuntimeLoadOptions = {},
): Promise<RuntimeSongEditionCore> {
  const edition = await client.loadEdition(catalogEdition.editionUrl, options)
  const [lyrics, timeline, visual] = await Promise.all([
    client.loadLyrics(edition.lyricsUrl, options),
    client.loadTimeline(edition.timelineUrl, options),
    client.loadVisual(edition.visualUrl, options),
  ])
  const features = await Promise.all(
    edition.features.map(async (descriptor) => ({
      descriptor,
      content: await client.loadFeature(descriptor, options),
    })),
  )

  const core = { catalogEdition, edition, lyrics, timeline, visual, features }
  return { ...core, assembled: assembleRuntimeSongEdition(core) }
}
