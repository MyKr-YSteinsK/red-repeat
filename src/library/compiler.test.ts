import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CatalogSchema } from './runtime-schema'
import { compileLibrary } from './compiler'

const temporaryRoots: string[] = []

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => {
    fs.rmSync(root, { recursive: true, force: true })
  })
})

describe('Library Compiler foundation', () => {
  it('generates a valid empty catalog without a source Library', async () => {
    const sourceRoot = createTemporaryRoot()
    const outputRoot = createTemporaryRoot()
    fs.rmSync(sourceRoot, { recursive: true, force: true })

    const result = await compileLibrary({ sourceRoot, outputRoot })
    const catalog = JSON.parse(
      fs.readFileSync(path.join(outputRoot, 'catalog.json'), 'utf8'),
    ) as unknown

    expect(result).toMatchObject({ valid: true, songCount: 0 })
    expect(result.emittedFiles).toEqual(['catalog.json'])
    expect(CatalogSchema.safeParse(catalog).success).toBe(true)
  })
})

function createTemporaryRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'red-repeat-compiler-'))
  temporaryRoots.push(root)
  return root
}
