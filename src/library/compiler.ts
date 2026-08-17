import fs from 'node:fs'
import path from 'node:path'
import { createValidationResult, type Diagnostic, type ValidationResult } from './diagnostics'
import { hashJson, stableJsonBuffer } from './hash'
import { discoverSongPackages } from './source-package'
import { CatalogSchema, type Catalog } from './runtime-schema'
import { validateLibrary } from './validator'

export const DEFAULT_RUNTIME_OUTPUT_ROOT = path.resolve(
  process.cwd(),
  'public/library-runtime',
)

export interface CompileLibraryOptions {
  sourceRoot?: string
  outputRoot?: string
}

export interface CompileLibraryResult extends ValidationResult {
  outputRoot: string
  emittedFiles: string[]
}

export async function compileLibrary(
  options: CompileLibraryOptions = {},
): Promise<CompileLibraryResult> {
  const sourceRoot = path.resolve(options.sourceRoot ?? path.resolve(process.cwd(), 'library'))
  const outputRoot = path.resolve(
    options.outputRoot ?? DEFAULT_RUNTIME_OUTPUT_ROOT,
  )
  const validation = validateLibrary(sourceRoot)

  if (!validation.valid) {
    return {
      ...validation,
      outputRoot,
      emittedFiles: [],
    }
  }

  const songPackages = discoverSongPackages(sourceRoot)

  if (songPackages.length > 0) {
    throw new Error(
      'Non-empty source packages require the media compiler pipeline from Plan 03 Phase 2',
    )
  }

  const catalogPayload = {
    contractVersion: 1 as const,
    editions: [],
  }
  const catalog: Catalog = {
    ...catalogPayload,
    contentHash: hashJson(catalogPayload),
  }
  const catalogValidation = CatalogSchema.safeParse(catalog)

  if (!catalogValidation.success) {
    const diagnostics: Diagnostic[] = catalogValidation.error.issues.map(
      (issue) => ({
        severity: 'error',
        code: 'SCHEMA_INVALID',
        sourcePath: 'catalog.json',
        message: `generated catalog: ${issue.message}`,
      }),
    )
    return {
      ...createValidationResult(diagnostics, 0),
      outputRoot,
      emittedFiles: [],
    }
  }

  const emittedFiles = writeGeneratedOutput(outputRoot, catalog)
  return {
    ...validation,
    outputRoot,
    emittedFiles,
  }
}

function writeGeneratedOutput(outputRoot: string, catalog: Catalog): string[] {
  const tempRoot = `${outputRoot}.tmp-${process.pid}`
  fs.rmSync(tempRoot, { recursive: true, force: true })
  fs.mkdirSync(tempRoot, { recursive: true })
  fs.writeFileSync(
    path.join(tempRoot, 'catalog.json'),
    stableJsonBuffer(catalog),
  )
  fs.rmSync(outputRoot, { recursive: true, force: true })
  fs.renameSync(tempRoot, outputRoot)
  return ['catalog.json']
}
