import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type {
  LyricsDocument,
  TimelineDocument,
  VisualDocument,
} from '../library/schema'
import type { RuntimeClient, RuntimeLoadOptions } from './runtime-client'

export interface RuntimeSongEditionCore {
  catalogEdition: CatalogEdition
  edition: RuntimeEdition
  lyrics: LyricsDocument
  timeline: TimelineDocument
  visual: VisualDocument
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

  return { catalogEdition, edition, lyrics, timeline, visual }
}
