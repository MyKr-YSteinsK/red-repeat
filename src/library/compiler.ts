import fs from 'node:fs'
import path from 'node:path'
import {
  createValidationResult,
  type Diagnostic,
  type ValidationResult,
} from './diagnostics'
import {
  compileAudio,
  compileArtwork,
  COVER_LARGE_MAX_WIDTH,
  COVER_SMALL_MAX_WIDTH,
  HERO_LARGE_MAX_WIDTH,
  MediaCompileError,
} from './media'
import { hashJson, hashText, stableJsonBuffer } from './hash'
import {
  CatalogSchema,
  RuntimeEditionSchema,
  type Catalog,
  type CatalogEdition,
  type RuntimeFeatureDescriptor,
} from './runtime-schema'
import {
  LyricsSchema,
  ManifestSchema,
  TimelineSchema,
  VisualSchema,
  type SongManifest,
} from './schema'
import {
  discoverSongPackages,
  findPackageFiles,
  loadSourcePackage,
  type DiscoveredSongPackage,
  type JsonSourceFile,
} from './source-package'
import { validateLibrary } from './validator'

export const DEFAULT_RUNTIME_OUTPUT_ROOT = path.resolve(
  process.cwd(),
  'public/library-runtime',
)
export const DEFAULT_CACHE_ROOT = path.resolve(
  process.cwd(),
  '.cache/library-compiler',
)

export interface CompileLibraryOptions {
  sourceRoot?: string
  outputRoot?: string
  cacheRoot?: string
}

export interface CompileLibraryResult extends ValidationResult {
  outputRoot: string
  emittedFiles: string[]
}

interface CompiledSong {
  catalogEdition: CatalogEdition
}

export async function compileLibrary(
  options: CompileLibraryOptions = {},
): Promise<CompileLibraryResult> {
  const sourceRoot = path.resolve(
    options.sourceRoot ?? path.resolve(process.cwd(), 'library'),
  )
  const outputRoot = path.resolve(
    options.outputRoot ?? DEFAULT_RUNTIME_OUTPUT_ROOT,
  )
  const cacheRoot = path.resolve(options.cacheRoot ?? DEFAULT_CACHE_ROOT)
  const validation = validateLibrary(sourceRoot)

  if (!validation.valid) {
    return {
      ...validation,
      outputRoot,
      emittedFiles: [],
    }
  }

  const songPackages = discoverSongPackages(sourceRoot)
  const temporaryOutputRoot = `${outputRoot}.tmp-${process.pid}`
  const compileDiagnostics: Diagnostic[] = []
  const compiledSongs: CompiledSong[] = []

  removeDirectory(temporaryOutputRoot)
  fs.mkdirSync(temporaryOutputRoot, { recursive: true })

  for (const songPackage of songPackages) {
    try {
      compiledSongs.push(
        await compileSongPackage({
          songPackage,
          sourceRoot,
          outputRoot: temporaryOutputRoot,
          cacheRoot,
        }),
      )
    } catch (error) {
      compileDiagnostics.push(createCompileDiagnostic(error, songPackage, sourceRoot))
    }
  }

  if (compileDiagnostics.length > 0) {
    removeDirectory(temporaryOutputRoot)
    return {
      ...createValidationResult(
        [...validation.diagnostics, ...compileDiagnostics],
        songPackages.length,
      ),
      outputRoot,
      emittedFiles: [],
    }
  }

  const catalogPayload = {
    contractVersion: 1 as const,
    editions: compiledSongs
      .map(({ catalogEdition }) => catalogEdition)
      .sort((left, right) => left.songId.localeCompare(right.songId)),
  }
  const catalog: Catalog = {
    ...catalogPayload,
    contentHash: hashJson(catalogPayload),
  }
  const catalogValidation = CatalogSchema.safeParse(catalog)

  if (!catalogValidation.success) {
    removeDirectory(temporaryOutputRoot)
    const diagnostics: Diagnostic[] = catalogValidation.error.issues.map(
      (issue) => ({
        severity: 'error',
        code: 'SCHEMA_INVALID',
        sourcePath: 'catalog.json',
        message: `generated catalog: ${issue.message}`,
      }),
    )
    return {
      ...createValidationResult(
        [...validation.diagnostics, ...diagnostics],
        songPackages.length,
      ),
      outputRoot,
      emittedFiles: [],
    }
  }

  fs.writeFileSync(
    path.join(temporaryOutputRoot, 'catalog.json'),
    stableJsonBuffer(catalog),
  )
  replaceGeneratedOutput(temporaryOutputRoot, outputRoot)

  return {
    ...validation,
    outputRoot,
    emittedFiles: listGeneratedFiles(outputRoot),
  }
}

async function compileSongPackage(options: {
  songPackage: DiscoveredSongPackage
  sourceRoot: string
  outputRoot: string
  cacheRoot: string
}): Promise<CompiledSong> {
  const loaded = loadSourcePackage(options.songPackage)
  const manifest = parseSourceFile(loaded.manifest, ManifestSchema)
  const lyrics = parseSourceFile(loaded.lyrics, LyricsSchema)
  const timeline = parseSourceFile(loaded.timeline, TimelineSchema)
  const visual = parseSourceFile(loaded.visual, VisualSchema)
  const audioSource = findPackageFiles(
    path.join(options.songPackage.directoryPath, 'audio'),
    /^source\.[^./]+$/,
  )[0]
  const coverSource = findPackageFiles(
    path.join(options.songPackage.directoryPath, 'artwork'),
    /^cover\.[^./]+$/,
  )[0]
  const heroSource = findPackageFiles(
    path.join(options.songPackage.directoryPath, 'artwork'),
    /^hero\.[^./]+$/,
  )[0]
  const songOutputRoot = path.join(options.outputRoot, 'songs', manifest.songId)
  const maxTimelineEndMs = timeline.sections.reduce(
    (maximum, section) => Math.max(maximum, section.endMs),
    0,
  )
  const maxPlayEndMs = timeline.occurrences.reduce(
    (maximum, occurrence) => Math.max(maximum, occurrence.playEndMs),
    maxTimelineEndMs,
  )

  if (!audioSource || !coverSource) {
    throw new Error(
      `validated package ${manifest.songId} is missing a canonical audio or cover source`,
    )
  }

  const audio = await compileAudio({
    sourcePath: audioSource,
    destinationDirectory: songOutputRoot,
    cacheRoot: options.cacheRoot,
    maxPlayEndMs,
  })
  const coverSmall = await compileArtwork({
    sourcePath: coverSource,
    destinationDirectory: songOutputRoot,
    cacheRoot: options.cacheRoot,
    variant: 'cover-small',
    maxWidth: COVER_SMALL_MAX_WIDTH,
  })
  const coverLarge = await compileArtwork({
    sourcePath: coverSource,
    destinationDirectory: songOutputRoot,
    cacheRoot: options.cacheRoot,
    variant: 'cover-large',
    maxWidth: COVER_LARGE_MAX_WIDTH,
  })
  const heroLarge = heroSource
    ? await compileArtwork({
        sourcePath: heroSource,
        destinationDirectory: songOutputRoot,
        cacheRoot: options.cacheRoot,
        variant: 'hero-large',
        maxWidth: HERO_LARGE_MAX_WIDTH,
      })
    : undefined
  const lyricsFilename = writeStructuredResource(
    songOutputRoot,
    'lyrics',
    lyrics,
  )
  const timelineFilename = writeStructuredResource(
    songOutputRoot,
    'timeline',
    timeline,
  )
  const visualFilename = writeStructuredResource(
    songOutputRoot,
    'visual',
    visual,
  )
  const features = compileFeatures(
    options.songPackage,
    songOutputRoot,
    manifest.songId,
  )
  const editionPayload = {
    contractVersion: 1 as const,
    song: toRuntimeSongMetadata(manifest),
    lyricsUrl: runtimeUrl(manifest.songId, lyricsFilename),
    timelineUrl: runtimeUrl(manifest.songId, timelineFilename),
    visualUrl: runtimeUrl(manifest.songId, visualFilename),
    features,
    audio: {
      url: runtimeUrl(manifest.songId, audio.filename),
      sourceHash: audio.sourceHash,
      runtimeHash: audio.runtimeHash,
      durationMs: audio.durationMs,
      format: audio.format,
    },
    artwork: {
      coverSmallUrl: runtimeUrl(manifest.songId, coverSmall.filename),
      coverLargeUrl: runtimeUrl(manifest.songId, coverLarge.filename),
      ...(heroLarge
        ? { heroLargeUrl: runtimeUrl(manifest.songId, heroLarge.filename) }
        : {}),
    },
  }
  const editionHash = hashJson(editionPayload)
  const edition = {
    ...editionPayload,
    contentHash: editionHash,
  }
  const editionValidation = RuntimeEditionSchema.safeParse(edition)

  if (!editionValidation.success) {
    throw new Error(
      `generated edition schema is invalid: ${editionValidation.error.issues
        .map((issue) => issue.message)
        .join('; ')}`,
    )
  }

  const editionFilename = `edition.${editionHash}.json`
  fs.writeFileSync(
    path.join(songOutputRoot, editionFilename),
    stableJsonBuffer(edition),
  )

  return {
    catalogEdition: {
      songId: manifest.songId,
      title: manifest.title,
      artist: manifest.artist,
      ...(manifest.album ? { album: manifest.album } : {}),
      ...(manifest.year !== undefined ? { year: manifest.year } : {}),
      recommendedTheme: visual.recommendedTheme,
      coverUrl: runtimeUrl(manifest.songId, coverSmall.filename),
      editionUrl: runtimeUrl(manifest.songId, editionFilename),
    },
  }
}

function compileFeatures(
  songPackage: DiscoveredSongPackage,
  songOutputRoot: string,
  songId: string,
): RuntimeFeatureDescriptor[] {
  const featureFiles = findPackageFiles(
    path.join(songPackage.directoryPath, 'features'),
    /\.md$/i,
  )

  return featureFiles.map((sourcePath) => {
    const id = path.basename(sourcePath, path.extname(sourcePath))
    const content = fs.readFileSync(sourcePath, 'utf8').replace(/\r\n?/g, '\n')
    const contentHash = hashText(content)
    const filename = `${id}.${contentHash}.md`
    const featureOutputRoot = path.join(songOutputRoot, 'features')
    fs.mkdirSync(featureOutputRoot, { recursive: true })
    fs.writeFileSync(path.join(featureOutputRoot, filename), content, 'utf8')

    return {
      id,
      url: runtimeUrl(songId, `features/${filename}`),
    }
  })
}

function writeStructuredResource(
  songOutputRoot: string,
  resourceName: string,
  value: unknown,
): string {
  const contentHash = hashJson(value)
  const filename = `${resourceName}.${contentHash}.json`
  fs.mkdirSync(songOutputRoot, { recursive: true })
  fs.writeFileSync(
    path.join(songOutputRoot, filename),
    stableJsonBuffer(value),
  )
  return filename
}

function parseSourceFile<T>(
  sourceFile: JsonSourceFile,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
): T {
  if (sourceFile.status !== 'ok') {
    throw new Error(`validated source file is not readable: ${sourceFile.filePath}`)
  }

  const result = schema.safeParse(sourceFile.value)
  if (!result.success || result.data === undefined) {
    throw new Error(`validated source file is no longer schema-compatible: ${sourceFile.filePath}`)
  }
  return result.data
}

function toRuntimeSongMetadata(manifest: SongManifest) {
  return {
    songId: manifest.songId,
    title: manifest.title,
    artist: manifest.artist,
    ...(manifest.album ? { album: manifest.album } : {}),
    ...(manifest.year !== undefined ? { year: manifest.year } : {}),
    ...(manifest.intro ? { intro: manifest.intro } : {}),
  }
}

function runtimeUrl(songId: string, relativePath: string): string {
  return `/library-runtime/songs/${songId}/${relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`
}

function createCompileDiagnostic(
  error: unknown,
  songPackage: DiscoveredSongPackage,
  sourceRoot: string,
): Diagnostic {
  const code =
    error instanceof MediaCompileError ? error.code : 'MEDIA_TRANSFORM_ERROR'
  return {
    severity: 'error',
    code,
    songId: songPackage.directoryName,
    sourcePath: toSourcePath(sourceRoot, songPackage.directoryPath),
    message: error instanceof Error ? error.message : String(error),
  }
}

function replaceGeneratedOutput(
  temporaryOutputRoot: string,
  outputRoot: string,
): void {
  fs.mkdirSync(path.dirname(outputRoot), { recursive: true })
  removeDirectory(outputRoot)
  fs.renameSync(temporaryOutputRoot, outputRoot)
}

function removeDirectory(directoryPath: string): void {
  fs.rmSync(directoryPath, {
    recursive: true,
    force: true,
    maxRetries: 8,
    retryDelay: 100,
  })
}

function listGeneratedFiles(outputRoot: string): string[] {
  const files: string[] = []

  const visit = (directoryPath: string): void => {
    for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
      const entryPath = path.join(directoryPath, entry.name)
      if (entry.isDirectory()) {
        visit(entryPath)
      } else if (entry.isFile()) {
        files.push(toSourcePath(outputRoot, entryPath))
      }
    }
  }

  visit(outputRoot)
  return files.sort()
}

function toSourcePath(sourceRoot: string, targetPath: string): string {
  const relativePath = path.relative(sourceRoot, targetPath) || '.'
  return relativePath.split(path.sep).join('/')
}
