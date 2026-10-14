import { describe, expect, it } from 'vitest'
import type { CatalogEdition } from './runtime-schema'
import type { SongDownloadState } from '../pwa/song-download'
import {
  getInstalledSnapshotEdition,
  matchesCatalogSearch,
} from './catalog-search'

const song = (overrides: Partial<CatalogEdition>): CatalogEdition => ({
  songId: 'sample-song',
  title: 'Ｆｉｒｓｔ　Light',
  artist: 'A Composer',
  album: 'Returning Home',
  coverUrl: '/cover.webp',
  editionUrl: '/edition.json',
  ...overrides,
})

describe('matchesCatalogSearch', () => {
  it('normalizes Unicode width and whitespace, and AND-matches words across fields', () => {
    expect(matchesCatalogSearch(song({}), 'first   composer')).toBe(true)
    expect(matchesCatalogSearch(song({}), 'ＦＩＲＳＴ')).toBe(true)
    expect(matchesCatalogSearch(song({}), 'first missing')).toBe(false)
  })

  it('matches stable songId words for romanized and unknown editions', () => {
    expect(
      matchesCatalogSearch(
        song({ songId: 'shinkai-shoujo', title: '深海少女' }),
        'shinkai shoujo',
      ),
    ).toBe(true)
    expect(
      matchesCatalogSearch(
        song({ songId: 'work-millennium-parade', title: 'Ｗ●ＲＫ' }),
        'WORK',
      ),
    ).toBe(true)
    expect(
      matchesCatalogSearch(
        song({ songId: 'new-unknown-edition', title: '新歌曲' }),
        'unknown edition',
      ),
    ).toBe(true)
  })

  it('matches only the documented simplified-title aliases', () => {
    expect(
      matchesCatalogSearch(
        song({ songId: 'senbonzakura', title: '千本桜' }),
        '千本樱',
      ),
    ).toBe(true)
    expect(
      matchesCatalogSearch(
        song({ songId: 'mousou-kanshou-daishou-renmei', title: '妄想感傷代償連盟' }),
        '妄想感伤代偿联盟',
      ),
    ).toBe(true)
    expect(
      matchesCatalogSearch(
        song({ songId: 'doushite-takase-toya', title: 'どうして' }),
        '为什么',
      ),
    ).toBe(false)
  })

  it('matches an empty query without filtering', () => {
    expect(matchesCatalogSearch(song({}), '  ')).toBe(true)
  })

  it('uses only an identity-matched installed snapshot for offline display', () => {
    const h1 = song({ title: 'First Light H1', editionUrl: '/edition.h1.json' })
    const catalogH2 = song({ title: 'First Light H2', editionUrl: '/edition.h2.json' })
    const installedH1: SongDownloadState = {
      songId: 'sample-song',
      status: 'installed',
      snapshotEdition: h1,
    }

    expect(getInstalledSnapshotEdition(catalogH2.songId, installedH1)).toBe(h1)
    expect(matchesCatalogSearch(h1, 'H1')).toBe(true)
    expect(matchesCatalogSearch(h1, 'H2')).toBe(false)
    expect(
      getInstalledSnapshotEdition('different-song', installedH1),
    ).toBeUndefined()
    expect(
      getInstalledSnapshotEdition(catalogH2.songId, {
        ...installedH1,
        snapshotEdition: { ...h1, songId: 'different-song' },
      }),
    ).toBeUndefined()
  })
})
