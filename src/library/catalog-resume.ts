import type { CatalogEdition } from './runtime-schema'
import {
  readPracticeResumeMetadata,
  resolvePracticeResumeSummary,
  type PracticeResumeSummary,
} from '../practice/practice-state'
import type { RuntimeClient, RuntimeLoadOptions } from '../runtime/runtime-client'

export async function loadCatalogPracticeResume(
  client: RuntimeClient,
  edition: CatalogEdition,
  options: RuntimeLoadOptions = {},
): Promise<PracticeResumeSummary | undefined> {
  const metadata = readPracticeResumeMetadata(edition.songId)
  if (!metadata) {
    return undefined
  }

  try {
    const runtimeEdition = await client.loadEdition(edition.editionUrl, options)
    const [practice, timeline] = await Promise.all([
      client.loadPractice(runtimeEdition.practiceUrl, options),
      client.loadTimeline(runtimeEdition.timelineUrl, options),
    ])
    return resolvePracticeResumeSummary(metadata, practice, timeline)
  } catch {
    return undefined
  }
}
