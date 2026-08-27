import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { hashText } from './hash'
import { validateLibrary } from './validator'

const temporaryRoots: string[] = []

const manifest = {
  songId: 'first-light',
  title: 'First Light',
  artist: 'A Composer',
}

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
  audioSourceHash: hashText('synthetic audio placeholder'),
  sections: [{ id: 'verse-1', label: 'Verse 1', startMs: 0, endMs: 4000 }],
  occurrences: [
    {
      id: 'o001',
      segmentId: 's001',
      sectionId: 'verse-1',
      startMs: 1000,
      endMs: 2500,
      playStartMs: 500,
      playEndMs: 3000,
    },
  ],
}

const practice = {
  units: [
    {
      id: 'p001',
      sectionId: 'verse-1',
      label: 'Verse 1',
      occurrenceIds: ['o001'],
    },
  ],
}

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => {
    fs.rmSync(root, { recursive: true, force: true })
  })
})

describe('Library Validator', () => {
  it('accepts an absent or empty Library', () => {
    const root = createTemporaryRoot()
    fs.rmSync(root, { recursive: true, force: true })

    const result = validateLibrary(root)

    expect(result).toMatchObject({
      valid: true,
      songCount: 0,
      errors: 0,
      warnings: 0,
    })
  })

  it('accepts one valid synthetic edition', () => {
    const root = createTemporaryRoot()
    createValidPackage(root)

    const result = validateLibrary(root)

    expect(result).toMatchObject({ valid: true, songCount: 1, errors: 0 })
    expect(result.warnings).toBe(0)
  })

  it('reports invalid ruby coverage through the source validator', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    writeJson(path.join(packageDirectory, 'lyrics.json'), {
      segments: [
        {
          id: 's001',
          lyrics: '歌',
          translation: 'Song',
          ruby: [{ start: 0, end: 1, base: '唄', reading: 'うた' }],
        },
      ],
    })

    const result = validateLibrary(root)
    const diagnostic = result.diagnostics.find(
      ({ code, fieldPath }) =>
        code === 'SCHEMA_INVALID' && fieldPath === 'segments.0.ruby.0.base',
    )

    expect(diagnostic).toMatchObject({
      severity: 'error',
      sourcePath: 'first-light/lyrics.json',
    })
  })

  it('reports a Timeline audio source hash mismatch', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    writeJson(path.join(packageDirectory, 'timeline.json'), {
      ...timeline,
      audioSourceHash: 'b'.repeat(64),
    })

    const result = validateLibrary(root)
    const diagnostic = result.diagnostics.find(
      ({ code }) => code === 'TIMELINE_AUDIO_SOURCE_MISMATCH',
    )

    expect(diagnostic).toMatchObject({
      severity: 'error',
      fieldPath: 'audioSourceHash',
      sourcePath: 'first-light/timeline.json',
    })
  })

  it('reports a songId and directory mismatch', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    writeJson(path.join(packageDirectory, 'manifest.json'), {
      ...manifest,
      songId: 'different-song',
    })

    const result = validateLibrary(root)

    expectCode(result, 'SONG_ID_DIRECTORY_MISMATCH')
  })

  it('reports missing required source files', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    fs.rmSync(path.join(packageDirectory, 'lyrics.json'))

    const result = validateLibrary(root)

    expectCode(result, 'MISSING_SOURCE_FILE')
  })

  it('reports a missing required practice.json', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    fs.rmSync(path.join(packageDirectory, 'practice.json'))

    expectCode(validateLibrary(root), 'MISSING_SOURCE_FILE')
  })

  it('rejects invalid Practice Unit cross-file references and coverage', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    writeJson(path.join(packageDirectory, 'practice.json'), {
      units: [
        {
          id: 'p001',
          sectionId: 'missing-section',
          label: 'Broken',
          occurrenceIds: ['o999'],
        },
      ],
    })

    const result = validateLibrary(root)

    expectCode(result, 'PRACTICE_UNKNOWN_SECTION')
    expectCode(result, 'PRACTICE_UNKNOWN_OCCURRENCE')
    expectCode(result, 'PRACTICE_OCCURRENCE_UNCOVERED')
  })

  it('rejects duplicate, mismatched, and repeated Practice assignments', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    writeJson(path.join(packageDirectory, 'timeline.json'), {
      ...timeline,
      sections: [
        ...timeline.sections,
        { id: 'chorus', label: 'Chorus', startMs: 4000, endMs: 6000 },
      ],
      occurrences: [
        timeline.occurrences[0],
        {
          ...timeline.occurrences[0],
          id: 'o002',
          sectionId: 'chorus',
          startMs: 4100,
          endMs: 4500,
          playStartMs: 4000,
          playEndMs: 5000,
        },
      ],
    })
    writeJson(path.join(packageDirectory, 'practice.json'), {
      units: [
        {
          id: 'p001',
          sectionId: 'verse-1',
          label: 'Verse 1',
          occurrenceIds: ['o001', 'o001'],
        },
        {
          id: 'p001',
          sectionId: 'verse-1',
          label: 'Duplicate',
          occurrenceIds: ['o001'],
        },
        {
          id: 'p002',
          sectionId: 'verse-1',
          label: 'Wrong Section',
          occurrenceIds: ['o002'],
        },
      ],
    })

    const result = validateLibrary(root)

    expectCode(result, 'PRACTICE_DUPLICATE_UNIT_ID')
    expectCode(result, 'PRACTICE_DUPLICATE_OCCURRENCE')
    expectCode(result, 'PRACTICE_OCCURRENCE_MULTI_ASSIGNMENT')
    expectCode(result, 'PRACTICE_SECTION_MISMATCH')
  })

  it('rejects Practice Unit occurrence and source ordering errors', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    writeJson(path.join(packageDirectory, 'timeline.json'), {
      ...timeline,
      occurrences: [
        timeline.occurrences[0],
        {
          ...timeline.occurrences[0],
          id: 'o002',
          startMs: 3000,
          endMs: 3500,
          playStartMs: 2500,
          playEndMs: 3800,
        },
      ],
    })
    writeJson(path.join(packageDirectory, 'practice.json'), {
      units: [
        {
          id: 'p001',
          sectionId: 'verse-1',
          label: 'Later first',
          occurrenceIds: ['o002'],
        },
        {
          id: 'p002',
          sectionId: 'verse-1',
          label: 'Earlier second',
          occurrenceIds: ['o001'],
        },
      ],
    })

    const result = validateLibrary(root)

    expectCode(result, 'PRACTICE_UNIT_OUT_OF_ORDER')

    writeJson(path.join(packageDirectory, 'practice.json'), {
      units: [
        {
          id: 'p001',
          sectionId: 'verse-1',
          label: 'Reversed',
          occurrenceIds: ['o002', 'o001'],
        },
      ],
    })
    expectCode(validateLibrary(root), 'PRACTICE_OCCURRENCE_OUT_OF_ORDER')
  })

  it('reports missing and ambiguous media sources', () => {
    const missingAudioRoot = createTemporaryRoot()
    const missingAudioPackage = createValidPackage(missingAudioRoot)
    fs.rmSync(path.join(missingAudioPackage, 'audio'), {
      recursive: true,
      force: true,
    })

    expectCode(validateLibrary(missingAudioRoot), 'MISSING_AUDIO_SOURCE')

    const ambiguousAudioRoot = createTemporaryRoot()
    const ambiguousAudioPackage = createValidPackage(ambiguousAudioRoot)
    fs.writeFileSync(
      path.join(ambiguousAudioPackage, 'audio', 'source.wav'),
      'synthetic audio placeholder',
    )

    expectCode(
      validateLibrary(ambiguousAudioRoot),
      'AMBIGUOUS_AUDIO_SOURCE',
    )
  })

  it('reports missing cover artwork', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    fs.rmSync(path.join(packageDirectory, 'artwork', 'cover.jpg'))

    const result = validateLibrary(root)

    expectCode(result, 'MISSING_COVER_ARTWORK')
  })

  it('reports ambiguous cover and hero artwork', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    fs.writeFileSync(
      path.join(packageDirectory, 'artwork', 'cover.webp'),
      'second synthetic cover placeholder',
    )
    fs.writeFileSync(
      path.join(packageDirectory, 'artwork', 'hero.webp'),
      'second synthetic hero placeholder',
    )

    const result = validateLibrary(root)

    expectCode(result, 'AMBIGUOUS_COVER_ARTWORK')
    expectCode(result, 'AMBIGUOUS_HERO_ARTWORK')
  })

  it('reports unknown Segment and Section references', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    writeJson(path.join(packageDirectory, 'timeline.json'), {
      ...timeline,
      occurrences: [
        {
          ...timeline.occurrences[0],
          segmentId: 's999',
          sectionId: 'bridge',
        },
      ],
    })

    const result = validateLibrary(root)

    expectCode(result, 'UNKNOWN_SEGMENT_REFERENCE')
    expectCode(result, 'UNKNOWN_SECTION_REFERENCE')
  })

  it('accepts adjacent Sections and legal gaps', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    writeJson(path.join(packageDirectory, 'timeline.json'), {
      audioSourceHash: timeline.audioSourceHash,
      sections: [
        { id: 'verse-1', label: 'Verse 1', startMs: 0, endMs: 1000 },
        { id: 'instrumental', label: 'Instrumental', startMs: 1500, endMs: 2000 },
        { id: 'verse-2', label: 'Verse 2', startMs: 2000, endMs: 4000 },
      ],
      occurrences: [
        {
          ...timeline.occurrences[0],
          startMs: 100,
          endMs: 700,
          playStartMs: 0,
          playEndMs: 1600,
        },
      ],
    })

    const result = validateLibrary(root)

    expect(result.valid).toBe(true)
    expect(result.errors).toBe(0)
  })

  it('rejects overlapping and out-of-order Sections', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    writeJson(path.join(packageDirectory, 'timeline.json'), {
      audioSourceHash: timeline.audioSourceHash,
      sections: [
        { id: 'verse-2', label: 'Verse 2', startMs: 1200, endMs: 2000 },
        { id: 'verse-1', label: 'Verse 1', startMs: 0, endMs: 1500 },
      ],
      occurrences: [],
    })

    const result = validateLibrary(root)

    expectCode(result, 'SECTION_OUT_OF_ORDER')
    expectCode(result, 'SECTION_OVERLAP')
  })

  it('rejects an Occurrence whose actual range escapes its Section', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    writeJson(path.join(packageDirectory, 'timeline.json'), {
      ...timeline,
      occurrences: [
        {
          ...timeline.occurrences[0],
          startMs: 100,
          endMs: 4500,
          playStartMs: 0,
          playEndMs: 5000,
        },
      ],
    })

    expectCode(validateLibrary(root), 'OCCURRENCE_OUTSIDE_SECTION')
  })

  it('accepts a play range crossing Section boundaries', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    writeJson(path.join(packageDirectory, 'timeline.json'), {
      audioSourceHash: timeline.audioSourceHash,
      sections: [
        { id: 'verse-1', label: 'Verse 1', startMs: 0, endMs: 1000 },
        { id: 'verse-2', label: 'Verse 2', startMs: 1000, endMs: 4000 },
      ],
      occurrences: [
        {
          ...timeline.occurrences[0],
          startMs: 200,
          endMs: 800,
          playStartMs: 0,
          playEndMs: 1200,
        },
      ],
    })

    const result = validateLibrary(root)

    expect(result.valid).toBe(true)
    expect(result.errors).toBe(0)
  })

  it('accepts an instrumental Section with no Occurrences', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    writeJson(path.join(packageDirectory, 'timeline.json'), {
      audioSourceHash: timeline.audioSourceHash,
      sections: [
        { id: 'verse-1', label: 'Verse 1', startMs: 0, endMs: 2500 },
        { id: 'instrumental', label: 'Instrumental', startMs: 2500, endMs: 4000 },
      ],
      occurrences: [timeline.occurrences[0]],
    })

    const result = validateLibrary(root)

    expect(result.valid).toBe(true)
    expect(result.errors).toBe(0)
  })

  it('reports invalid Feature Segment references', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    fs.mkdirSync(path.join(packageDirectory, 'features'))
    fs.writeFileSync(
      path.join(packageDirectory, 'features', 'reading.md'),
      'A note about [[segment:s999]].',
    )

    const result = validateLibrary(root)

    expectCode(result, 'UNKNOWN_FEATURE_SEGMENT_REFERENCE')
  })

  it('treats missing hero artwork as a warning only', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    fs.rmSync(path.join(packageDirectory, 'artwork', 'hero.jpg'))

    const result = validateLibrary(root)

    expect(result.valid).toBe(true)
    expect(result.errors).toBe(0)
    expect(result.warnings).toBe(1)
    expectCode(result, 'NO_HERO_ARTWORK')
  })

  it('marks contract errors as a non-zero validation result', () => {
    const root = createTemporaryRoot()
    const packageDirectory = createValidPackage(root)
    writeJson(path.join(packageDirectory, 'lyrics.json'), {
      segments: [{ ...lyrics.segments[0], translation: '' }],
    })

    const result = validateLibrary(root)

    expect(result.valid).toBe(false)
    expect(result.errors).toBeGreaterThan(0)
  })
})

function createTemporaryRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'red-repeat-library-'))
  temporaryRoots.push(root)
  return root
}

function createValidPackage(root: string): string {
  const packageDirectory = path.join(root, manifest.songId)
  fs.mkdirSync(path.join(packageDirectory, 'audio'), { recursive: true })
  fs.mkdirSync(path.join(packageDirectory, 'artwork'), { recursive: true })

  writeJson(path.join(packageDirectory, 'manifest.json'), manifest)
  writeJson(path.join(packageDirectory, 'lyrics.json'), lyrics)
  writeJson(path.join(packageDirectory, 'timeline.json'), timeline)
  writeJson(path.join(packageDirectory, 'practice.json'), practice)
  fs.writeFileSync(
    path.join(packageDirectory, 'audio', 'source.mp3'),
    'synthetic audio placeholder',
  )
  fs.writeFileSync(
    path.join(packageDirectory, 'artwork', 'cover.jpg'),
    'synthetic cover placeholder',
  )
  fs.writeFileSync(
    path.join(packageDirectory, 'artwork', 'hero.jpg'),
    'synthetic hero placeholder',
  )

  return packageDirectory
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function expectCode(
  result: ReturnType<typeof validateLibrary>,
  code: string,
): void {
  expect(result.diagnostics.some((diagnostic) => diagnostic.code === code)).toBe(
    true,
  )
}
