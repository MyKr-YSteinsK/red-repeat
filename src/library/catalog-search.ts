import type { CatalogEdition } from './runtime-schema'
import type { SongDownloadState } from '../pwa/song-download'

// These aliases are one-to-one orthographic variants of canonical public
// manifest titles: 千本桜 in simplified Chinese, and 妄想感傷代償連盟 with
// the corresponding simplified characters. They are not translated titles.
const TITLE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  senbonzakura: ['千本樱'],
  'mousou-kanshou-daishou-renmei': ['妄想感伤代偿联盟'],
}

export function matchesCatalogSearch(
  edition: CatalogEdition,
  query: string,
): boolean {
  const tokens = normalizeCatalogSearchText(query).split(' ').filter(Boolean)
  if (tokens.length === 0) {
    return true
  }

  const searchableText = normalizeCatalogSearchText(
    [
      edition.title,
      edition.artist,
      edition.album ?? '',
      edition.songId,
      ...(TITLE_ALIASES[edition.songId] ?? []),
    ].join(' '),
  )
  return tokens.every((token) => searchableText.includes(token))
}

export function getInstalledSnapshotEdition(
  songId: string,
  state: SongDownloadState | undefined,
): CatalogEdition | undefined {
  if (
    state?.status !== 'installed' ||
    state.songId !== songId ||
    state.snapshotEdition?.songId !== songId
  ) {
    return undefined
  }
  return state.snapshotEdition
}

function normalizeCatalogSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s_-]+/gu, ' ')
    .trim()
}
