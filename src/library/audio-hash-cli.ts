import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashFile } from './hash'
import {
  discoverSongPackages,
  findCanonicalAudioSources,
} from './source-package'
import { SongIdSchema } from './schema'
import {
  resolveLibrarySourceRoot,
  resolveLibrarySourceRootFromArgs,
  SourceRootCliError,
} from './source-root'

export interface AudioSourceFingerprint {
  songId: string
  sourcePath: string
  audioSourceHash: string
}

export type AudioHashErrorCode =
  | 'INVALID_USAGE'
  | 'UNKNOWN_SONG'
  | 'MISSING_AUDIO_SOURCE'
  | 'AMBIGUOUS_AUDIO_SOURCE'
  | 'SOURCE_READ_ERROR'

export class AudioHashCliError extends Error {
  public readonly code: AudioHashErrorCode

  constructor(code: AudioHashErrorCode, message: string) {
    super(message)
    this.name = 'AudioHashCliError'
    this.code = code
  }
}

export function findAudioSourceFingerprint(
  songId: string,
  sourceRoot = resolveLibrarySourceRoot(),
): AudioSourceFingerprint {
  if (!SongIdSchema.safeParse(songId).success) {
    throw new AudioHashCliError(
      'UNKNOWN_SONG',
      `unknown song id "${songId}"`,
    )
  }

  const songPackage = discoverSongPackages(path.resolve(sourceRoot)).find(
    ({ directoryName }) => directoryName === songId,
  )
  if (!songPackage) {
    throw new AudioHashCliError(
      'UNKNOWN_SONG',
      `unknown song id "${songId}" under ${path.resolve(sourceRoot)}`,
    )
  }

  const audioSources = findCanonicalAudioSources(songPackage)
  if (audioSources.length === 0) {
    throw new AudioHashCliError(
      'MISSING_AUDIO_SOURCE',
      `missing canonical audio/source.* file for "${songId}"`,
    )
  }
  if (audioSources.length > 1) {
    throw new AudioHashCliError(
      'AMBIGUOUS_AUDIO_SOURCE',
      `found multiple canonical audio sources for "${songId}": ${audioSources
        .map((filePath) => path.basename(filePath))
        .join(', ')}`,
    )
  }

  const sourcePath = audioSources[0]
  let audioSourceHash: string
  try {
    audioSourceHash = hashFile(sourcePath)
  } catch (error) {
    throw new AudioHashCliError(
      'SOURCE_READ_ERROR',
      `could not hash canonical audio source ${sourcePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }

  return { songId, sourcePath, audioSourceHash }
}

export function runAudioHashCli(
  args: readonly string[] = process.argv.slice(2),
  options: {
    sourceRoot?: string
    cwd?: string
    envSourceRoot?: string
  } = {},
): number {
  try {
    const { positionalArgs, sourceRoot } = resolveLibrarySourceRootFromArgs(
      args,
      options,
    )
    if (positionalArgs.length !== 1) {
      throw new AudioHashCliError(
        'INVALID_USAGE',
        'Usage: npm run library:audio-hash -- <song-id> [--source-root <path>]',
      )
    }

    const result = findAudioSourceFingerprint(positionalArgs[0], sourceRoot)
    console.log(
      [
        `songId: ${result.songId}`,
        `sourcePath: ${toDisplayPath(result.sourcePath)}`,
        `audioSourceHash: ${result.audioSourceHash}`,
      ].join('\n'),
    )
    return 0
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const code =
      error instanceof AudioHashCliError
        ? error.code
        : error instanceof SourceRootCliError
          ? 'INVALID_USAGE'
          : 'SOURCE_READ_ERROR'
    console.error(`Audio hash failed [${code}]: ${message}`)
    return 1
  }
}

function toDisplayPath(filePath: string): string {
  const relativePath = path.relative(process.cwd(), filePath)
  return (relativePath || filePath).split(path.sep).join('/')
}

function isMainModule(): boolean {
  return Boolean(
    process.argv[1] &&
      path.resolve(process.argv[1]) === fileURLToPath(import.meta.url),
  )
}

if (isMainModule()) {
  process.exitCode = runAudioHashCli()
}
