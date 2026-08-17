import fs from 'node:fs'
import path from 'node:path'
import { SOURCE_FILE_NAMES } from './schema'

export interface DiscoveredSongPackage {
  directoryName: string
  directoryPath: string
}

export type JsonSourceFile =
  | { status: 'missing'; filePath: string }
  | { status: 'invalid'; filePath: string; message: string }
  | { status: 'ok'; filePath: string; value: unknown }

export type LoadedSourcePackage = Record<
  keyof typeof SOURCE_FILE_NAMES,
  JsonSourceFile
>

export function discoverSongPackages(sourceRoot: string): DiscoveredSongPackage[] {
  if (!isDirectory(sourceRoot)) {
    return []
  }

  return fs
    .readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => ({
      directoryName: entry.name,
      directoryPath: path.join(sourceRoot, entry.name),
    }))
}

export function loadSourcePackage(
  songPackage: DiscoveredSongPackage,
): LoadedSourcePackage {
  return {
    manifest: readJsonSourceFile(
      path.join(songPackage.directoryPath, SOURCE_FILE_NAMES.manifest),
    ),
    lyrics: readJsonSourceFile(
      path.join(songPackage.directoryPath, SOURCE_FILE_NAMES.lyrics),
    ),
    timeline: readJsonSourceFile(
      path.join(songPackage.directoryPath, SOURCE_FILE_NAMES.timeline),
    ),
    visual: readJsonSourceFile(
      path.join(songPackage.directoryPath, SOURCE_FILE_NAMES.visual),
    ),
  }
}

export function readJsonSourceFile(filePath: string): JsonSourceFile {
  if (!fs.existsSync(filePath)) {
    return { status: 'missing', filePath }
  }

  try {
    return {
      status: 'ok',
      filePath,
      value: JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown,
    }
  } catch (error) {
    return {
      status: 'invalid',
      filePath,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

export function findPackageFiles(
  directoryPath: string,
  namePattern: RegExp,
): string[] {
  try {
    return fs
      .readdirSync(directoryPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && namePattern.test(entry.name))
      .map((entry) => path.join(directoryPath, entry.name))
      .sort((left, right) => left.localeCompare(right))
  } catch {
    return []
  }
}

function isDirectory(targetPath: string): boolean {
  try {
    return fs.statSync(targetPath).isDirectory()
  } catch {
    return false
  }
}
