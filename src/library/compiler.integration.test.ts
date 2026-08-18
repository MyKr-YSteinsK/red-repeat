import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { compileLibrary } from './compiler'
import { hashFile, hashJson } from './hash'
import { probeAudio } from './media'
import {
  CatalogSchema,
  RuntimeEditionSchema,
  type Catalog,
  type RuntimeEdition,
} from './runtime-schema'

const temporaryRoots: string[] = []

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => {
    fs.rmSync(root, {
      recursive: true,
      force: true,
      maxRetries: 8,
      retryDelay: 100,
    })
  })
})

describe('Library Compiler media pipeline', () => {
  it('compiles real synthetic media and keeps unchanged resources stable', async () => {
    const fixture = await createFixture()
    const firstResult = await compileLibrary(fixture.options)

    expect(firstResult).toMatchObject({
      valid: true,
      songCount: 1,
      errors: 0,
      warnings: 0,
    })

    const firstSnapshot = snapshotFiles(fixture.outputRoot)
    const firstEdition = readCompiledEdition(fixture.outputRoot)

    expect(firstEdition.catalog.editions).toHaveLength(1)
    expect(firstEdition.edition.features).toEqual([
      expect.objectContaining({ id: 'reading' }),
    ])
    expect(firstEdition.edition.audio.sourceHash).toMatch(/^[a-f0-9]{64}$/)
    expect(firstEdition.edition.contentHash).toBe(
      hashJson({
        contractVersion: firstEdition.edition.contractVersion,
        song: firstEdition.edition.song,
        lyricsUrl: firstEdition.edition.lyricsUrl,
        timelineUrl: firstEdition.edition.timelineUrl,
        visualUrl: firstEdition.edition.visualUrl,
        features: firstEdition.edition.features,
        audio: firstEdition.edition.audio,
        artwork: firstEdition.edition.artwork,
      }),
    )
    expect(firstEdition.edition.artwork.heroLargeUrl).toBeDefined()
    expect(firstEdition.editionUrls.every((url) => fileForRuntimeUrl(fixture.outputRoot, url))).toBe(true)

    const audioPath = fileForRuntimeUrl(
      fixture.outputRoot,
      firstEdition.edition.audio.url,
    )
    const compiledTimeline = JSON.parse(
      fs.readFileSync(
        fileForRuntimeUrl(fixture.outputRoot, firstEdition.edition.timelineUrl),
        'utf8',
      ),
    ) as { audioSourceHash: string }
    expect(compiledTimeline.audioSourceHash).toBe(hashFile(fixture.audioPath))
    const audioProbe = await probeAudio(audioPath)
    expect(audioProbe.codec).toBe('aac')
    expect(audioProbe.channels).toBe(2)
    expect([44100, 48000]).toContain(audioProbe.sampleRate)
    expect(audioProbe.container.split(',')).toContain('mp4')
    expect(audioProbe.durationMs).toBeGreaterThan(0)

    await expectArtwork(fixture.outputRoot, firstEdition.edition.artwork.coverSmallUrl, 640)
    await expectArtwork(fixture.outputRoot, firstEdition.edition.artwork.coverLargeUrl, 1600)
    await expectArtwork(fixture.outputRoot, firstEdition.edition.artwork.heroLargeUrl, 1920)

    const secondResult = await compileLibrary(fixture.options)
    const secondSnapshot = snapshotFiles(fixture.outputRoot)
    const secondEdition = readCompiledEdition(fixture.outputRoot)

    expect(secondResult.valid).toBe(true)
    expect(secondSnapshot).toEqual(firstSnapshot)
    expect(secondEdition.edition.audio.url).toBe(firstEdition.edition.audio.url)

    writeJson(path.join(fixture.songRoot, 'lyrics.json'), {
      ...fixture.lyrics,
      segments: [
        {
          ...fixture.lyrics.segments[0],
          translation: '一行被修改过的歌词',
        },
      ],
    })
    const lyricsResult = await compileLibrary(fixture.options)
    const lyricsEdition = readCompiledEdition(fixture.outputRoot).edition

    expect(lyricsResult.valid).toBe(true)
    expect(lyricsEdition.audio.url).toBe(firstEdition.edition.audio.url)
    expect(lyricsEdition.lyricsUrl).not.toBe(firstEdition.edition.lyricsUrl)

    await writeArtwork(fixture.coverPath, '#bb3344', 2048, 1024)
    const coverResult = await compileLibrary(fixture.options)
    const coverEdition = readCompiledEdition(fixture.outputRoot).edition

    expect(coverResult.valid).toBe(true)
    expect(coverEdition.audio.url).toBe(firstEdition.edition.audio.url)
    expect(coverEdition.artwork.coverLargeUrl).not.toBe(
      firstEdition.edition.artwork.coverLargeUrl,
    )

    writeWav(fixture.audioPath, 0.3)
    const changedTimelinePath = path.join(fixture.songRoot, 'timeline.json')
    const changedTimeline = JSON.parse(
      fs.readFileSync(changedTimelinePath, 'utf8'),
    ) as Record<string, unknown>
    writeJson(changedTimelinePath, {
      ...changedTimeline,
      audioSourceHash: hashFile(fixture.audioPath),
    })
    const audioResult = await compileLibrary(fixture.options)
    const audioEdition = readCompiledEdition(fixture.outputRoot).edition

    expect(audioResult.valid).toBe(true)
    expect(audioEdition.audio.url).not.toBe(firstEdition.edition.audio.url)
    expect(audioEdition.audio.sourceHash).not.toBe(
      firstEdition.edition.audio.sourceHash,
    )
  }, 30_000)

  it('allows a missing hero and removes stale generated resources', async () => {
    const fixture = await createFixture()
    await compileLibrary(fixture.options)
    fs.rmSync(fixture.heroPath)

    const result = await compileLibrary(fixture.options)
    const edition = readCompiledEdition(fixture.outputRoot).edition

    expect(result).toMatchObject({ valid: true, warnings: 1 })
    expect(result.diagnostics.some(({ code }) => code === 'NO_HERO_ARTWORK')).toBe(
      true,
    )
    expect(edition.artwork.heroLargeUrl).toBeUndefined()
    expect(
      Object.keys(snapshotFiles(fixture.outputRoot)).some((filePath) =>
        filePath.includes('hero-large.'),
      ),
    ).toBe(false)
  }, 30_000)

  it('removes a song runtime directory when its source package is deleted', async () => {
    const fixture = await createFixture()
    const secondSongRoot = path.join(
      fixture.options.sourceRoot,
      'second-light',
    )
    fs.cpSync(fixture.songRoot, secondSongRoot, { recursive: true })
    writeJson(path.join(secondSongRoot, 'manifest.json'), {
      songId: 'second-light',
      title: 'Second Light',
      artist: 'A Composer',
    })

    const firstResult = await compileLibrary(fixture.options)
    expect(firstResult).toMatchObject({ valid: true, songCount: 2 })
    expect(
      fs.existsSync(
        path.join(fixture.outputRoot, 'songs', 'second-light'),
      ),
    ).toBe(true)

    fs.rmSync(secondSongRoot, { recursive: true, force: true })
    const secondResult = await compileLibrary(fixture.options)

    expect(secondResult).toMatchObject({ valid: true, songCount: 1 })
    expect(
      fs.existsSync(
        path.join(fixture.outputRoot, 'songs', 'second-light'),
      ),
    ).toBe(false)
  }, 30_000)

  it('fails when Timeline playback exceeds probed audio duration', async () => {
    const fixture = await createFixture({ playEndMs: 2_000 })

    const result = await compileLibrary(fixture.options)

    expect(result.valid).toBe(false)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'TIMELINE_EXCEEDS_AUDIO_DURATION',
        }),
      ]),
    )
    expect(fs.existsSync(path.join(fixture.outputRoot, 'catalog.json'))).toBe(
      false,
    )
  }, 30_000)

  it('blocks compilation when Timeline audio identity is stale', async () => {
    const fixture = await createFixture()
    const timelinePath = path.join(fixture.songRoot, 'timeline.json')
    const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8')) as Record<
      string,
      unknown
    >
    writeJson(timelinePath, {
      ...timeline,
      audioSourceHash: '0'.repeat(64),
    })

    const result = await compileLibrary(fixture.options)

    expect(result.valid).toBe(false)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'TIMELINE_AUDIO_SOURCE_MISMATCH',
          fieldPath: 'audioSourceHash',
        }),
      ]),
    )
    expect(fs.existsSync(path.join(fixture.outputRoot, 'catalog.json'))).toBe(
      false,
    )
  }, 30_000)

  it('fails when an instrumental Section exceeds probed audio duration', async () => {
    const fixture = await createFixture({ sectionEndMs: 2_000 })

    const result = await compileLibrary(fixture.options)

    expect(result.valid).toBe(false)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'TIMELINE_EXCEEDS_AUDIO_DURATION',
        }),
      ]),
    )
  }, 30_000)
})

interface Fixture {
  options: {
    sourceRoot: string
    outputRoot: string
    cacheRoot: string
  }
  songRoot: string
  outputRoot: string
  audioPath: string
  coverPath: string
  heroPath: string
  lyrics: {
    segments: Array<{
      id: string
      lyrics: string
      translation: string
    }>
  }
}

async function createFixture(
  options: { playEndMs?: number; sectionEndMs?: number } = {},
): Promise<Fixture> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'red-repeat-compiler-media-'))
  temporaryRoots.push(root)

  const sourceRoot = path.join(root, 'library')
  const outputRoot = path.join(root, 'runtime')
  const cacheRoot = path.join(root, 'cache')
  const songRoot = path.join(sourceRoot, 'first-light')
  const audioPath = path.join(songRoot, 'audio', 'source.wav')
  const coverPath = path.join(songRoot, 'artwork', 'cover.png')
  const heroPath = path.join(songRoot, 'artwork', 'hero.png')
  const lyrics = {
    segments: [
      {
        id: 's001',
        lyrics: 'A line worth returning to',
        translation: '一行值得反复回到的歌词',
      },
    ],
  }
  const timeline = {
    sections: [
      {
        id: 'verse-1',
        label: 'Verse 1',
        startMs: 0,
        endMs: options.sectionEndMs ?? 1_000,
      },
    ],
    occurrences: [
      {
        id: 'o001',
        segmentId: 's001',
        sectionId: 'verse-1',
        startMs: 100,
        endMs: 700,
        playStartMs: 0,
        playEndMs: options.playEndMs ?? 800,
      },
    ],
  }

  fs.mkdirSync(path.join(songRoot, 'features'), { recursive: true })
  fs.mkdirSync(path.dirname(audioPath), { recursive: true })
  fs.mkdirSync(path.dirname(coverPath), { recursive: true })
  writeJson(path.join(songRoot, 'manifest.json'), {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
    album: 'Synthetic Sessions',
    year: 2026,
    intro: 'A synthetic fixture for compiler integration tests.',
  })
  writeJson(path.join(songRoot, 'lyrics.json'), lyrics)
  writeJson(path.join(songRoot, 'visual.json'), {
    recommendedTheme: 'cinema',
    mood: ['restrained'],
    sectionCues: [{ sectionId: 'verse-1', cue: 'expand' }],
  })
  fs.writeFileSync(
    path.join(songRoot, 'features', 'reading.md'),
    'Read this line [[segment:s001]].\n',
  )
  writeWav(audioPath, 0)
  writeJson(path.join(songRoot, 'timeline.json'), {
    ...timeline,
    audioSourceHash: hashFile(audioPath),
  })
  await writeArtwork(coverPath, '#334455', 2048, 1024)
  await writeArtwork(heroPath, '#556677', 2400, 1200)

  return {
    options: { sourceRoot, outputRoot, cacheRoot },
    songRoot,
    outputRoot,
    audioPath,
    coverPath,
    heroPath,
    lyrics,
  }
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function writeWav(filePath: string, amplitude: number): void {
  const sampleRate = 44_100
  const sampleCount = sampleRate
  const dataSize = sampleCount * 2
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0, 'ascii')
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8, 'ascii')
  buffer.write('fmt ', 12, 'ascii')
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36, 'ascii')
  buffer.writeUInt32LE(dataSize, 40)

  for (let index = 0; index < sampleCount; index += 1) {
    const sample = Math.round(
      Math.sin((2 * Math.PI * 440 * index) / sampleRate) * amplitude * 32_000,
    )
    buffer.writeInt16LE(sample, 44 + index * 2)
  }

  fs.writeFileSync(filePath, buffer)
}

async function writeArtwork(
  filePath: string,
  color: string,
  width: number,
  height: number,
): Promise<void> {
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: color,
    },
  })
    .png()
    .toFile(filePath)
}

function readCompiledEdition(outputRoot: string): {
  catalog: Catalog
  edition: RuntimeEdition
  editionUrls: string[]
} {
  const catalog = CatalogSchema.parse(
    JSON.parse(fs.readFileSync(path.join(outputRoot, 'catalog.json'), 'utf8')),
  )
  const catalogPayload = {
    contractVersion: catalog.contractVersion,
    editions: catalog.editions,
  }
  expect(catalog.contentHash).toBe(hashJson(catalogPayload))

  const editionUrl = catalog.editions[0]?.editionUrl
  if (!editionUrl) {
    throw new Error('compiled catalog does not contain an edition URL')
  }

  const edition = RuntimeEditionSchema.parse(
    JSON.parse(
      fs.readFileSync(fileForRuntimeUrl(outputRoot, editionUrl), 'utf8'),
    ),
  )
  const editionUrls = [
    edition.lyricsUrl,
    edition.timelineUrl,
    edition.visualUrl,
    edition.audio.url,
    edition.artwork.coverSmallUrl,
    edition.artwork.coverLargeUrl,
    ...(edition.artwork.heroLargeUrl
      ? [edition.artwork.heroLargeUrl]
      : []),
    ...edition.features.map(({ url }) => url),
  ]

  return { catalog, edition, editionUrls }
}

function fileForRuntimeUrl(outputRoot: string, url: string): string {
  const prefix = '/library-runtime/'
  if (!url.startsWith(prefix)) {
    throw new Error(`unexpected runtime URL: ${url}`)
  }

  return path.join(
    outputRoot,
    ...url
      .slice(prefix.length)
      .split('/')
      .map((segment) => decodeURIComponent(segment)),
  )
}

function snapshotFiles(root: string): Record<string, string> {
  const snapshot: Record<string, string> = {}

  const visit = (directory: string): void => {
    fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))
      .forEach((entry) => {
        const entryPath = path.join(directory, entry.name)
        if (entry.isDirectory()) {
          visit(entryPath)
        } else {
          snapshot[path.relative(root, entryPath)] = fs
            .readFileSync(entryPath)
            .toString('base64')
        }
      })
  }

  visit(root)
  return snapshot
}

async function expectArtwork(
  outputRoot: string,
  url: string | undefined,
  maximumWidth: number,
): Promise<void> {
  if (!url) {
    throw new Error('expected artwork URL')
  }

  const metadata = await sharp(
    fs.readFileSync(fileForRuntimeUrl(outputRoot, url)),
  ).metadata()
  expect(metadata.format).toBe('webp')
  expect(metadata.width).toBeDefined()
  expect(metadata.width).toBeLessThanOrEqual(maximumWidth)
}
