import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import * as ffprobeStatic from 'ffprobe-static'
import sharp from 'sharp'
import { hashFile, hashText, stableJsonBuffer, stableStringify } from './hash'

export const TIMELINE_DURATION_TOLERANCE_MS = 100
export const COVER_SMALL_MAX_WIDTH = 640
export const COVER_LARGE_MAX_WIDTH = 1600
export const HERO_LARGE_MAX_WIDTH = 1920
export const ARTWORK_WEBP_QUALITY = 82

export interface AudioProbe {
  durationMs: number
  codec: string
  container: string
  sampleRate: number
  channels: number
}

export interface CompiledAudio {
  filename: string
  sourceHash: string
  runtimeHash: string
  durationMs: number
  format: {
    container: 'm4a'
    codec: 'aac-lc'
    bitrateKbps: 192
    sampleRate: 44100 | 48000
    channels: 2
  }
}

export interface CompiledArtwork {
  filename: string
  runtimeHash: string
}

export class MediaCompileError extends Error {
  public readonly code:
    | 'TIMELINE_EXCEEDS_AUDIO_DURATION'
    | 'MEDIA_TOOL_ERROR'
    | 'MEDIA_TRANSFORM_ERROR'

  constructor(
    code:
      | 'TIMELINE_EXCEEDS_AUDIO_DURATION'
      | 'MEDIA_TOOL_ERROR'
      | 'MEDIA_TRANSFORM_ERROR',
    message: string,
  ) {
    super(message)
    this.name = 'MediaCompileError'
    this.code = code
  }
}

export async function probeAudio(sourcePath: string): Promise<AudioProbe> {
  const probePath = ffprobeStatic.path

  if (!ffmpegPath || !probePath) {
    throw new MediaCompileError(
      'MEDIA_TOOL_ERROR',
      'ffmpeg/ffprobe binaries are unavailable; reinstall media tooling dependencies',
    )
  }

  let output: ProcessOutput

  try {
    output = await runProcess(probePath, [
      '-v',
      'error',
      '-show_format',
      '-show_streams',
      '-of',
      'json',
      sourcePath,
    ])
  } catch (error) {
    throw new MediaCompileError(
      'MEDIA_TOOL_ERROR',
      `ffprobe failed for ${sourcePath}: ${errorMessage(error)}`,
    )
  }

  try {
    const data = JSON.parse(output.stdout) as FfprobeOutput
    const audioStream = data.streams?.find((stream) => stream.codec_type === 'audio')
    const durationSeconds = Number(audioStream?.duration ?? data.format?.duration)
    const sampleRate = Number(audioStream?.sample_rate)
    const channels = Number(audioStream?.channels)

    if (
      !audioStream ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0 ||
      !Number.isInteger(sampleRate) ||
      !Number.isInteger(channels)
    ) {
      throw new Error('audio stream is missing duration, sample rate, or channels')
    }

    return {
      durationMs: Math.round(durationSeconds * 1000),
      codec: audioStream.codec_name ?? 'unknown',
      container: data.format?.format_name ?? 'unknown',
      sampleRate,
      channels,
    }
  } catch (error) {
    throw new MediaCompileError(
      'MEDIA_TOOL_ERROR',
      `could not parse ffprobe output for ${sourcePath}: ${errorMessage(error)}`,
    )
  }
}

export async function compileAudio(options: {
  sourcePath: string
  destinationDirectory: string
  cacheRoot: string
  maxPlayEndMs: number
}): Promise<CompiledAudio> {
  const probe = await probeAudio(options.sourcePath)
  const sampleRate: 44100 | 48000 = probe.sampleRate === 44100 ? 44100 : 48000
  const settings = {
    bitrateKbps: 192,
    channels: 2,
    codec: 'aac-lc',
    container: 'm4a',
    fastStart: true,
    sampleRate,
  } as const
  const sourceHash = hashFile(options.sourcePath)
  const cacheKey = hashText(`${sourceHash}\n${stableStringify(settings)}`)
  const cacheDirectory = path.join(options.cacheRoot, 'audio')
  const cachePath = path.join(cacheDirectory, `${cacheKey}.m4a`)
  const metadataPath = path.join(cacheDirectory, `${cacheKey}.json`)
  const cached = readCachedAudio(cachePath, metadataPath, sourceHash, settings)

  if (options.maxPlayEndMs > probe.durationMs + TIMELINE_DURATION_TOLERANCE_MS) {
    throw new MediaCompileError(
      'TIMELINE_EXCEEDS_AUDIO_DURATION',
      `timeline playEndMs ${options.maxPlayEndMs}ms exceeds audio duration ${probe.durationMs}ms (tolerance ${TIMELINE_DURATION_TOLERANCE_MS}ms)`,
    )
  }

  ensureDirectory(cacheDirectory)
  let runtimeHash: string

  if (cached) {
    runtimeHash = cached.runtimeHash
  } else {
    const temporaryPath = `${cachePath}.tmp-${process.pid}.m4a`
    fs.rmSync(temporaryPath, { force: true })

    if (!ffmpegPath) {
      throw new MediaCompileError(
        'MEDIA_TOOL_ERROR',
        'ffmpeg binary is unavailable; reinstall media tooling dependencies',
      )
    }

    try {
      await runProcess(ffmpegPath, [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        options.sourcePath,
        '-map_metadata',
        '-1',
        '-vn',
        '-c:a',
        'aac',
        '-profile:a',
        'aac_low',
        '-b:a',
        '192k',
        '-ac',
        '2',
        '-ar',
        String(sampleRate),
        '-movflags',
        '+faststart',
        '-fflags',
        '+bitexact',
        '-flags:a',
        '+bitexact',
        temporaryPath,
      ])
      fs.rmSync(cachePath, { force: true })
      fs.renameSync(temporaryPath, cachePath)
    } catch (error) {
      fs.rmSync(temporaryPath, { force: true })
      throw new MediaCompileError(
        'MEDIA_TOOL_ERROR',
        `ffmpeg failed for ${options.sourcePath}: ${errorMessage(error)}`,
      )
    }

    runtimeHash = hashFile(cachePath)
    fs.writeFileSync(
      metadataPath,
      stableJsonBuffer({ sourceHash, runtimeHash, settings }),
    )
  }

  ensureDirectory(options.destinationDirectory)
  const filename = `audio.${runtimeHash}.m4a`
  const destinationPath = path.join(options.destinationDirectory, filename)
  fs.copyFileSync(cachePath, destinationPath)
  const runtimeProbe = await probeAudio(destinationPath)

  if (
    runtimeProbe.codec !== 'aac' ||
    runtimeProbe.channels !== 2 ||
    runtimeProbe.sampleRate !== sampleRate ||
    !runtimeProbe.container.split(',').some((format) => format === 'mp4' || format === 'm4a')
  ) {
    throw new MediaCompileError(
      'MEDIA_TOOL_ERROR',
      `runtime audio probe did not match AAC-LC stereo M4A expectations for ${destinationPath}`,
    )
  }

  return {
    filename,
    sourceHash,
    runtimeHash,
    durationMs: runtimeProbe.durationMs,
    format: {
      container: 'm4a',
      codec: 'aac-lc',
      bitrateKbps: 192,
      sampleRate,
      channels: 2,
    },
  }
}

export async function compileArtwork(options: {
  sourcePath: string
  destinationDirectory: string
  cacheRoot: string
  variant: 'cover-small' | 'cover-large' | 'hero-large'
  maxWidth: number
}): Promise<CompiledArtwork> {
  const sourceHash = hashFile(options.sourcePath)
  const settings = {
    format: 'webp',
    maxWidth: options.maxWidth,
    quality: ARTWORK_WEBP_QUALITY,
    variant: options.variant,
  } as const
  const cacheKey = hashText(`${sourceHash}\n${stableStringify(settings)}`)
  const cacheDirectory = path.join(options.cacheRoot, 'artwork')
  const cachePath = path.join(cacheDirectory, `${cacheKey}.webp`)
  const metadataPath = path.join(cacheDirectory, `${cacheKey}.json`)
  const cached = readCachedArtwork(cachePath, metadataPath, sourceHash, settings)
  let runtimeHash: string

  ensureDirectory(cacheDirectory)

  if (cached) {
    runtimeHash = cached.runtimeHash
  } else {
    let output: Buffer

    try {
      output = await sharp(options.sourcePath)
        .resize({ width: options.maxWidth, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: ARTWORK_WEBP_QUALITY, effort: 4 })
        .toBuffer()
    } catch (error) {
      throw new MediaCompileError(
        'MEDIA_TRANSFORM_ERROR',
        `artwork transform failed for ${options.sourcePath}: ${errorMessage(error)}`,
      )
    }

    fs.writeFileSync(cachePath, output)
    runtimeHash = hashFile(cachePath)
    fs.writeFileSync(
      metadataPath,
      stableJsonBuffer({ sourceHash, runtimeHash, settings }),
    )
  }

  ensureDirectory(options.destinationDirectory)
  const filename = `${options.variant}.${runtimeHash}.webp`
  fs.copyFileSync(cachePath, path.join(options.destinationDirectory, filename))

  return { filename, runtimeHash }
}

interface CachedMetadata {
  sourceHash: string
  runtimeHash: string
  settings: unknown
}

interface ProcessOutput {
  stdout: string
  stderr: string
}

interface FfprobeOutput {
  streams?: Array<{
    codec_type?: string
    codec_name?: string
    duration?: string
    sample_rate?: string
    channels?: number
  }>
  format?: {
    duration?: string
    format_name?: string
  }
}

function readCachedAudio(
  cachePath: string,
  metadataPath: string,
  sourceHash: string,
  settings: unknown,
): { runtimeHash: string } | undefined {
  const metadata = readCachedMetadata(cachePath, metadataPath, sourceHash, settings)
  if (!metadata) {
    return undefined
  }

  const runtimeHash = hashFile(cachePath)
  return runtimeHash === metadata.runtimeHash ? { runtimeHash } : undefined
}

function readCachedArtwork(
  cachePath: string,
  metadataPath: string,
  sourceHash: string,
  settings: unknown,
): { runtimeHash: string } | undefined {
  const metadata = readCachedMetadata(cachePath, metadataPath, sourceHash, settings)
  if (!metadata) {
    return undefined
  }

  const runtimeHash = hashFile(cachePath)
  return runtimeHash === metadata.runtimeHash ? { runtimeHash } : undefined
}

function readCachedMetadata(
  cachePath: string,
  metadataPath: string,
  sourceHash: string,
  settings: unknown,
): CachedMetadata | undefined {
  if (!fs.existsSync(cachePath) || !fs.existsSync(metadataPath)) {
    return undefined
  }

  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8')) as CachedMetadata
    if (
      metadata.sourceHash !== sourceHash ||
      stableStringify(metadata.settings) !== stableStringify(settings) ||
      typeof metadata.runtimeHash !== 'string'
    ) {
      return undefined
    }
    return metadata
  } catch {
    return undefined
  }
}

function ensureDirectory(directoryPath: string): void {
  fs.mkdirSync(directoryPath, { recursive: true })
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function runProcess(command: string, args: string[]): Promise<ProcessOutput> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(new Error(`exit code ${code}: ${stderr.trim() || stdout.trim()}`))
      }
    })
  })
}
