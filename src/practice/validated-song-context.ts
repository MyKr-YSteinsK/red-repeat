import type { CatalogEdition } from '../library/runtime-schema'
import type { RuntimeClient, RuntimeLoadOptions } from '../runtime/runtime-client'
import { assembleRuntimeSongEdition } from '../runtime/song-edition'
import { readDownloadedSongSnapshot } from '../pwa/song-download'
import { canonicalOccurrenceTiming } from '../timeline/occurrence-timing'

/**
 * Read the active manifest-bound Edition and its identity-bearing documents
 * without changing Timing Debugger storage. Used by queue and backup previews.
 */
export async function loadValidatedSongContext(
  runtimeClient: RuntimeClient,
  catalogEdition: CatalogEdition,
  options: RuntimeLoadOptions = {},
) {
  const snapshot = await readDownloadedSongSnapshot(catalogEdition.songId)
  const effectiveCatalogEdition = snapshot?.catalogEdition ?? catalogEdition
  if (options.signal?.aborted) throw new Error('Song context request was cancelled.')
  const edition = await runtimeClient.loadEdition(effectiveCatalogEdition.editionUrl, options)
  if (edition.song.songId !== catalogEdition.songId) {
    throw new Error('Runtime Song Edition identity does not match the requested song.')
  }
  const [lyrics, timeline, practice] = await Promise.all([
    runtimeClient.loadLyrics(edition.lyricsUrl, options),
    runtimeClient.loadTimeline(edition.timelineUrl, options),
    runtimeClient.loadPractice(edition.practiceUrl, options),
  ])
  const assembled = assembleRuntimeSongEdition({
    catalogEdition: effectiveCatalogEdition,
    edition,
    lyrics,
    timeline,
    practice,
    timingProvider: canonicalOccurrenceTiming,
    features: [],
    allowMissingFeatureContent: true,
  })
  return {
    catalogEdition: effectiveCatalogEdition,
    edition,
    lyrics,
    timeline,
    practice,
    assembled,
  }
}
