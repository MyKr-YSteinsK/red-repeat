import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runLibraryCompileCli } from './compile-cli'
import { runLibraryValidateCli } from './cli'

const temporaryRoots: string[] = []

afterEach(() => {
  vi.restoreAllMocks()
  temporaryRoots.splice(0).forEach((root) => {
    fs.rmSync(root, { recursive: true, force: true })
  })
})

describe('Library CLI source-root contract', () => {
  it('uses the same source-root flag for validate and compile', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'red-repeat-cli-'))
    temporaryRoots.push(root)
    const outputRoot = path.join(root, 'runtime')
    const cacheRoot = path.join(root, 'cache')
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    expect(runLibraryValidateCli(['--source-root', root])).toBe(0)
    expect(
      await runLibraryCompileCli(['--source-root', root], {
        outputRoot,
        cacheRoot,
      }),
    ).toBe(0)

    expect(fs.existsSync(path.join(outputRoot, 'catalog.json'))).toBe(true)
    expect(log).toHaveBeenCalledWith(
      'Library validation passed: 0 edition(s).',
    )
    expect(log).toHaveBeenCalledWith(
      'Library compile passed: 0 edition(s), 1 runtime file(s).',
    )
  })
})
