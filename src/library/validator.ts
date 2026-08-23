import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import {
  createValidationResult,
  type Diagnostic,
  type ValidationResult,
} from './diagnostics'
import { hashFile } from './hash'
import {
  discoverSongPackages,
  findCanonicalAudioSources,
  findPackageFiles,
  loadSourcePackage,
  type DiscoveredSongPackage,
  type JsonSourceFile,
} from './source-package'
import {
  LyricsSchema,
  ManifestSchema,
  PracticeSchema,
  TimelineSchema,
  type LyricsDocument,
  type PracticeDocument,
  type TimelineDocument,
} from './schema'
import { resolveLibrarySourceRoot } from './source-root'

export function validateLibrary(
  sourceRoot = resolveLibrarySourceRoot(),
): ValidationResult {
  const resolvedRoot = path.resolve(sourceRoot)
  const diagnostics: Diagnostic[] = []
  const songPackages = discoverSongPackages(resolvedRoot)

  songPackages.forEach((songPackage) => {
    validateSongPackage(songPackage, resolvedRoot, diagnostics)
  })

  return createValidationResult(diagnostics, songPackages.length)
}

function validateSongPackage(
  songPackage: DiscoveredSongPackage,
  sourceRoot: string,
  diagnostics: Diagnostic[],
): void {
  const loadedFiles = loadSourcePackage(songPackage)
  const manifest = validateSourceFile(
    loadedFiles.manifest,
    ManifestSchema,
    songPackage,
    sourceRoot,
    diagnostics,
  )
  const lyrics = validateSourceFile(
    loadedFiles.lyrics,
    LyricsSchema,
    songPackage,
    sourceRoot,
    diagnostics,
  )
  const timeline = validateSourceFile(
    loadedFiles.timeline,
    TimelineSchema,
    songPackage,
    sourceRoot,
    diagnostics,
  )
  const practice = validateSourceFile(
    loadedFiles.practice,
    PracticeSchema,
    songPackage,
    sourceRoot,
    diagnostics,
  )
  const contextSongId = manifest?.songId ?? songPackage.directoryName

  if (manifest && manifest.songId !== songPackage.directoryName) {
    diagnostics.push({
      severity: 'error',
      code: 'SONG_ID_DIRECTORY_MISMATCH',
      songId: contextSongId,
      sourcePath: toSourcePath(sourceRoot, loadedFiles.manifest.filePath),
      fieldPath: 'songId',
      message: `manifest.songId "${manifest.songId}" must match directory "${songPackage.directoryName}"`,
    })
  }

  const audioSourcePath = validateMediaPresence(
    songPackage,
    sourceRoot,
    contextSongId,
    diagnostics,
  )

  if (timeline && audioSourcePath) {
    validateTimelineAudioSourceHash(
      timeline,
      audioSourcePath,
      songPackage,
      sourceRoot,
      contextSongId,
      diagnostics,
    )
  }

  if (lyrics && timeline) {
    validateTimelineReferences(
      lyrics,
      timeline,
      songPackage,
      sourceRoot,
      contextSongId,
      diagnostics,
    )
  }

  if (timeline) {
    validateTimelineStructure(
      timeline,
      songPackage,
      sourceRoot,
      contextSongId,
      diagnostics,
    )
  }

  if (practice && timeline) {
    validatePracticeReferences(
      practice,
      timeline,
      songPackage,
      sourceRoot,
      contextSongId,
      diagnostics,
    )
  }

  if (lyrics) {
    validateFeatureReferences(
      lyrics,
      songPackage,
      sourceRoot,
      contextSongId,
      diagnostics,
    )
  }
}

function validateSourceFile<T>(
  sourceFile: JsonSourceFile,
  schema: z.ZodType<T>,
  songPackage: DiscoveredSongPackage,
  sourceRoot: string,
  diagnostics: Diagnostic[],
): T | undefined {
  const sourcePath = toSourcePath(sourceRoot, sourceFile.filePath)

  if (sourceFile.status === 'missing') {
    diagnostics.push({
      severity: 'error',
      code: 'MISSING_SOURCE_FILE',
      songId: songPackage.directoryName,
      sourcePath,
      message: `required source file is missing: ${path.basename(sourceFile.filePath)}`,
    })
    return undefined
  }

  if (sourceFile.status === 'invalid') {
    diagnostics.push({
      severity: 'error',
      code: 'JSON_PARSE_ERROR',
      songId: songPackage.directoryName,
      sourcePath,
      message: `invalid JSON: ${sourceFile.message}`,
    })
    return undefined
  }

  const result = schema.safeParse(sourceFile.value)

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      const fieldPath = issue.path.map(String).join('.')
      diagnostics.push({
        severity: 'error',
        code: 'SCHEMA_INVALID',
        songId: songPackage.directoryName,
        sourcePath,
        fieldPath: fieldPath || undefined,
        message: fieldPath ? `${fieldPath}: ${issue.message}` : issue.message,
      })
    })
    return undefined
  }

  return result.data
}

function validateMediaPresence(
  songPackage: DiscoveredSongPackage,
  sourceRoot: string,
  songId: string,
  diagnostics: Diagnostic[],
): string | undefined {
  const audioDirectory = path.join(songPackage.directoryPath, 'audio')
  const artworkDirectory = path.join(songPackage.directoryPath, 'artwork')
  const audioFiles = findCanonicalAudioSources(songPackage)
  const coverFiles = findPackageFiles(artworkDirectory, /^cover\.[^./]+$/)
  const heroFiles = findPackageFiles(artworkDirectory, /^hero\.[^./]+$/)

  if (audioFiles.length === 0) {
    diagnostics.push({
      severity: 'error',
      code: 'MISSING_AUDIO_SOURCE',
      songId,
      sourcePath: toSourcePath(sourceRoot, audioDirectory),
      message: 'missing canonical audio/source.* file',
    })
  } else if (audioFiles.length > 1) {
    diagnostics.push({
      severity: 'error',
      code: 'AMBIGUOUS_AUDIO_SOURCE',
      songId,
      sourcePath: toSourcePath(sourceRoot, audioDirectory),
      message: `found multiple canonical audio sources: ${audioFiles
        .map((filePath) => path.basename(filePath))
        .join(', ')}`,
    })
  }

  if (coverFiles.length === 0) {
    diagnostics.push({
      severity: 'error',
      code: 'MISSING_COVER_ARTWORK',
      songId,
      sourcePath: toSourcePath(sourceRoot, artworkDirectory),
      message: 'missing canonical artwork/cover.* file',
    })
  } else if (coverFiles.length > 1) {
    diagnostics.push({
      severity: 'error',
      code: 'AMBIGUOUS_COVER_ARTWORK',
      songId,
      sourcePath: toSourcePath(sourceRoot, artworkDirectory),
      message: `found multiple canonical covers: ${coverFiles
        .map((filePath) => path.basename(filePath))
        .join(', ')}`,
    })
  }

  if (heroFiles.length === 0) {
    diagnostics.push({
      severity: 'warning',
      code: 'NO_HERO_ARTWORK',
      songId,
      sourcePath: toSourcePath(sourceRoot, artworkDirectory),
      message: 'optional artwork/hero.* file is not present',
    })
  } else if (heroFiles.length > 1) {
    diagnostics.push({
      severity: 'error',
      code: 'AMBIGUOUS_HERO_ARTWORK',
      songId,
      sourcePath: toSourcePath(sourceRoot, artworkDirectory),
      message: `found multiple canonical heroes: ${heroFiles
        .map((filePath) => path.basename(filePath))
        .join(', ')}`,
    })
  }

  return audioFiles.length === 1 ? audioFiles[0] : undefined
}

function validateTimelineAudioSourceHash(
  timeline: TimelineDocument,
  audioSourcePath: string,
  songPackage: DiscoveredSongPackage,
  sourceRoot: string,
  songId: string,
  diagnostics: Diagnostic[],
): void {
  const timelinePath = toSourcePath(
    sourceRoot,
    path.join(songPackage.directoryPath, 'timeline.json'),
  )

  let actualHash: string
  try {
    actualHash = hashFile(audioSourcePath)
  } catch (error) {
    diagnostics.push({
      severity: 'error',
      code: 'SOURCE_READ_ERROR',
      songId,
      sourcePath: toSourcePath(sourceRoot, audioSourcePath),
      message: `could not hash canonical audio source: ${
        error instanceof Error ? error.message : String(error)
      }`,
    })
    return
  }

  if (timeline.audioSourceHash !== actualHash) {
    diagnostics.push({
      severity: 'error',
      code: 'TIMELINE_AUDIO_SOURCE_MISMATCH',
      songId,
      sourcePath: timelinePath,
      fieldPath: 'audioSourceHash',
      message: `timeline audioSourceHash "${timeline.audioSourceHash}" does not match canonical audio source SHA-256 "${actualHash}"`,
    })
  }
}

function validateTimelineReferences(
  lyrics: LyricsDocument,
  timeline: TimelineDocument,
  songPackage: DiscoveredSongPackage,
  sourceRoot: string,
  songId: string,
  diagnostics: Diagnostic[],
): void {
  const segmentIds = new Set(lyrics.segments.map((segment) => segment.id))
  const sectionIds = new Set(timeline.sections.map((section) => section.id))
  const timelinePath = toSourcePath(
    sourceRoot,
    path.join(songPackage.directoryPath, 'timeline.json'),
  )

  timeline.occurrences.forEach((occurrence, index) => {
    if (!segmentIds.has(occurrence.segmentId)) {
      diagnostics.push({
        severity: 'error',
        code: 'UNKNOWN_SEGMENT_REFERENCE',
        songId,
        sourcePath: timelinePath,
        fieldPath: `occurrences[${index}].segmentId`,
        message: `Occurrence "${occurrence.id}" references unknown Segment "${occurrence.segmentId}"`,
      })
    }

    if (!sectionIds.has(occurrence.sectionId)) {
      diagnostics.push({
        severity: 'error',
        code: 'UNKNOWN_SECTION_REFERENCE',
        songId,
        sourcePath: timelinePath,
        fieldPath: `occurrences[${index}].sectionId`,
        message: `Occurrence "${occurrence.id}" references unknown Section "${occurrence.sectionId}"`,
      })
    }
  })
}

function validateTimelineStructure(
  timeline: TimelineDocument,
  songPackage: DiscoveredSongPackage,
  sourceRoot: string,
  songId: string,
  diagnostics: Diagnostic[],
): void {
  const timelinePath = toSourcePath(
    sourceRoot,
    path.join(songPackage.directoryPath, 'timeline.json'),
  )
  const sectionsById = new Map(
    timeline.sections.map((section) => [section.id, section]),
  )

  timeline.sections.forEach((section, index) => {
    const previousSection = timeline.sections[index - 1]

    if (previousSection && section.startMs < previousSection.startMs) {
      diagnostics.push({
        severity: 'error',
        code: 'SECTION_OUT_OF_ORDER',
        songId,
        sourcePath: timelinePath,
        fieldPath: `sections[${index}].startMs`,
        message: `Section "${section.id}" starts before the previous Section in source order`,
      })
    }
  })

  const sectionsByStart = timeline.sections
    .map((section, index) => ({ section, index }))
    .sort(
      (left, right) =>
        left.section.startMs - right.section.startMs || left.index - right.index,
    )

  sectionsByStart.forEach((current, index) => {
    const previous = sectionsByStart[index - 1]

    if (previous && previous.section.endMs > current.section.startMs) {
      diagnostics.push({
        severity: 'error',
        code: 'SECTION_OVERLAP',
        songId,
        sourcePath: timelinePath,
        fieldPath: `sections[${current.index}]`,
        message: `Section "${current.section.id}" overlaps Section "${previous.section.id}"`,
      })
    }
  })

  timeline.occurrences.forEach((occurrence, index) => {
    const section = sectionsById.get(occurrence.sectionId)

    if (
      section &&
      (occurrence.startMs < section.startMs || occurrence.endMs > section.endMs)
    ) {
      diagnostics.push({
        severity: 'error',
        code: 'OCCURRENCE_OUTSIDE_SECTION',
        songId,
        sourcePath: timelinePath,
        fieldPath: `occurrences[${index}]`,
        message: `Occurrence "${occurrence.id}" actual timing must stay within Section "${section.id}"; play range may cross Section boundaries`,
      })
    }
  })
}

function validatePracticeReferences(
  practice: PracticeDocument,
  timeline: TimelineDocument,
  songPackage: DiscoveredSongPackage,
  sourceRoot: string,
  songId: string,
  diagnostics: Diagnostic[],
): void {
  const practicePath = toSourcePath(
    sourceRoot,
    path.join(songPackage.directoryPath, 'practice.json'),
  )
  const sectionIds = new Set(timeline.sections.map((section) => section.id))
  const occurrencesById = new Map(
    timeline.occurrences.map((occurrence) => [occurrence.id, occurrence]),
  )
  const unitIds = new Map<string, number>()
  const assignedOccurrences = new Map<string, number>()
  const occurrenceOrder = new Map(
    timeline.occurrences.map((occurrence, index) => [
      occurrence.id,
      { occurrence, index },
    ]),
  )

  practice.units.forEach((unit, unitIndex) => {
    const firstUnitIndex = unitIds.get(unit.id)
    if (firstUnitIndex !== undefined) {
      diagnostics.push({
        severity: 'error',
        code: 'PRACTICE_DUPLICATE_UNIT_ID',
        songId,
        sourcePath: practicePath,
        fieldPath: `units[${unitIndex}].id`,
        message: `Practice Unit "${unit.id}" duplicates the Unit declared at index ${firstUnitIndex}`,
      })
    } else {
      unitIds.set(unit.id, unitIndex)
    }

    if (!sectionIds.has(unit.sectionId)) {
      diagnostics.push({
        severity: 'error',
        code: 'PRACTICE_UNKNOWN_SECTION',
        songId,
        sourcePath: practicePath,
        fieldPath: `units[${unitIndex}].sectionId`,
        message: `Practice Unit "${unit.id}" references unknown Section "${unit.sectionId}"`,
      })
    }

    let previousOrder: { occurrence: TimelineDocument['occurrences'][number]; index: number } | undefined
    let firstOrder: { occurrence: TimelineDocument['occurrences'][number]; index: number } | undefined

    unit.occurrenceIds.forEach((occurrenceId, occurrenceIndex) => {
      const occurrence = occurrencesById.get(occurrenceId)
      const fieldPath = `units[${unitIndex}].occurrenceIds[${occurrenceIndex}]`

      if (!occurrence) {
        diagnostics.push({
          severity: 'error',
          code: 'PRACTICE_UNKNOWN_OCCURRENCE',
          songId,
          sourcePath: practicePath,
          fieldPath,
          message: `Practice Unit "${unit.id}" references unknown Occurrence "${occurrenceId}"`,
        })
        return
      }

      const firstAssignment = assignedOccurrences.get(occurrenceId)
      if (firstAssignment !== undefined) {
        diagnostics.push({
          severity: 'error',
          code:
            firstAssignment === unitIndex
              ? 'PRACTICE_DUPLICATE_OCCURRENCE'
              : 'PRACTICE_OCCURRENCE_MULTI_ASSIGNMENT',
          songId,
          sourcePath: practicePath,
          fieldPath,
          message:
            firstAssignment === unitIndex
              ? `Occurrence "${occurrenceId}" is repeated within Practice Unit "${unit.id}"`
              : `Occurrence "${occurrenceId}" is assigned to multiple Practice Units; first assigned at Unit index ${firstAssignment}`,
        })
      } else {
        assignedOccurrences.set(occurrenceId, unitIndex)
      }

      if (occurrence.sectionId !== unit.sectionId) {
        diagnostics.push({
          severity: 'error',
          code: 'PRACTICE_SECTION_MISMATCH',
          songId,
          sourcePath: practicePath,
          fieldPath,
          message: `Occurrence "${occurrenceId}" belongs to Section "${occurrence.sectionId}", not Practice Unit Section "${unit.sectionId}"`,
        })
      }

      const order = occurrenceOrder.get(occurrenceId)
      if (!order) {
        return
      }

      firstOrder ??= order
      if (previousOrder && compareOccurrenceOrder(previousOrder, order) > 0) {
        diagnostics.push({
          severity: 'error',
          code: 'PRACTICE_OCCURRENCE_OUT_OF_ORDER',
          songId,
          sourcePath: practicePath,
          fieldPath,
          message: `Occurrence "${occurrenceId}" is out of chronological order within Practice Unit "${unit.id}"`,
        })
      }
      previousOrder = order
    })

    const previousUnit = practice.units[unitIndex - 1]
    if (previousUnit) {
      const previousFirst = getFirstPracticeOccurrence(
        previousUnit,
        occurrenceOrder,
      )
      if (
        firstOrder &&
        previousFirst &&
        compareOccurrenceOrder(previousFirst, firstOrder) > 0
      ) {
        diagnostics.push({
          severity: 'error',
          code: 'PRACTICE_UNIT_OUT_OF_ORDER',
          songId,
          sourcePath: practicePath,
          fieldPath: `units[${unitIndex}].occurrenceIds[0]`,
          message: `Practice Unit "${unit.id}" starts before the previous Practice Unit in source order`,
        })
      }
    }
  })

  timeline.occurrences.forEach((occurrence, occurrenceIndex) => {
    if (!assignedOccurrences.has(occurrence.id)) {
      diagnostics.push({
        severity: 'error',
        code: 'PRACTICE_OCCURRENCE_UNCOVERED',
        songId,
        sourcePath: practicePath,
        fieldPath: 'units',
        message: `Timeline Occurrence "${occurrence.id}" at index ${occurrenceIndex} is not covered by any Practice Unit`,
      })
    }
  })
}

function getFirstPracticeOccurrence(
  unit: PracticeDocument['units'][number],
  occurrenceOrder: ReadonlyMap<
    string,
    { occurrence: TimelineDocument['occurrences'][number]; index: number }
  >,
): { occurrence: TimelineDocument['occurrences'][number]; index: number } | undefined {
  const firstOccurrenceId = unit.occurrenceIds[0]
  return firstOccurrenceId ? occurrenceOrder.get(firstOccurrenceId) : undefined
}

function compareOccurrenceOrder(
  left: { occurrence: TimelineDocument['occurrences'][number]; index: number },
  right: { occurrence: TimelineDocument['occurrences'][number]; index: number },
): number {
  return left.occurrence.startMs - right.occurrence.startMs || left.index - right.index
}

function validateFeatureReferences(
  lyrics: LyricsDocument,
  songPackage: DiscoveredSongPackage,
  sourceRoot: string,
  songId: string,
  diagnostics: Diagnostic[],
): void {
  const featuresDirectory = path.join(songPackage.directoryPath, 'features')
  const segmentIds = new Set(lyrics.segments.map((segment) => segment.id))
  const markdownFiles = findPackageFiles(featuresDirectory, /\.md$/i)
  const referencePattern = /\[\[segment:([^\]\s]+)\]\]/g

  markdownFiles.forEach((filePath) => {
    let markdown: string

    try {
      markdown = fs.readFileSync(filePath, 'utf8')
    } catch (error) {
      diagnostics.push({
        severity: 'error',
        code: 'SOURCE_READ_ERROR',
        songId,
        sourcePath: toSourcePath(sourceRoot, filePath),
        message: `could not read feature Markdown: ${
          error instanceof Error ? error.message : String(error)
        }`,
      })
      return
    }

    for (const match of markdown.matchAll(referencePattern)) {
      const segmentId = match[1]

      if (!segmentIds.has(segmentId)) {
        diagnostics.push({
          severity: 'error',
          code: 'UNKNOWN_FEATURE_SEGMENT_REFERENCE',
          songId,
          sourcePath: toSourcePath(sourceRoot, filePath),
          message: `feature references unknown Segment "${segmentId}"`,
        })
      }
    }
  })
}

function toSourcePath(sourceRoot: string, targetPath: string): string {
  const relativePath = path.relative(sourceRoot, targetPath) || '.'
  return relativePath.split(path.sep).join('/')
}
