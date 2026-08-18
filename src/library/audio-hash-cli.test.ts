import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  findAudioSourceFingerprint,
  runAudioHashCli,
} from './audio-hash-cli'
import { hashFile } from './hash'

const temporaryRoots: string[] = []

afterEach(() => {
  vi.restoreAllMocks()
  temporaryRoots.splice(0).forEach((root) => {
    fs.rmSync(root, { recursive: true, force: true })
  })
})

describe('library:audio-hash', () => {
  it('prints the same source fingerprint used by the compiler contract', () => {
    const { root, sourcePath } = createPackage()
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    expect(runAudioHashCli(['first-light'], { sourceRoot: root })).toBe(0)
    expect(findAudioSourceFingerprint('first-light', root)).toEqual({
      songId: 'first-light',
      sourcePath,
      audioSourceHash: hashFile(sourcePath),
    })
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(`audioSourceHash: ${hashFile(sourcePath)}`),
    )
  })

  it('fails deterministically for unknown, missing, and ambiguous sources', () => {
    const root = createTemporaryRoot()
    expect(() => findAudioSourceFingerprint('missing-song', root)).toThrow(
      'unknown song id "missing-song"',
    )

    const missing = createPackage(root, 'missing-audio')
    fs.rmSync(path.dirname(missing.sourcePath), { recursive: true, force: true })
    expect(() => findAudioSourceFingerprint('missing-audio', root)).toThrow(
      'missing canonical audio/source.* file',
    )

    const ambiguous = createPackage(root, 'ambiguous-audio')
    fs.writeFileSync(
      path.join(path.dirname(ambiguous.sourcePath), 'source.wav'),
      'second audio source',
    )
    expect(() => findAudioSourceFingerprint('ambiguous-audio', root)).toThrow(
      'found multiple canonical audio sources',
    )
  })

  it('does not create runtime output or mutate the source package', () => {
    const { root, sourcePath } = createPackage()
    const before = snapshotFiles(root)
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    expect(runAudioHashCli(['first-light'], { sourceRoot: root })).toBe(0)

    expect(snapshotFiles(root)).toEqual(before)
    expect(fs.existsSync(path.join(root, 'public', 'library-runtime'))).toBe(
      false,
    )
    expect(output).toHaveBeenCalled()
    expect(fs.existsSync(sourcePath)).toBe(true)
  })
})

function createTemporaryRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'red-repeat-audio-hash-'))
  temporaryRoots.push(root)
  return root
}

function createPackage(
  root = createTemporaryRoot(),
  songId = 'first-light',
): { root: string; sourcePath: string } {
  const songRoot = path.join(root, songId)
  const sourcePath = path.join(songRoot, 'audio', 'source.mp3')
  fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
  fs.writeFileSync(sourcePath, `synthetic audio for ${songId}`)
  return { root, sourcePath }
}

function snapshotFiles(root: string): Record<string, string> {
  const snapshot: Record<string, string> = {}
  const visit = (directory: string): void => {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
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
