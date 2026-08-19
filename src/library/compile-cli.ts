import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileLibrary } from './compiler'
import {
  resolveLibrarySourceRootFromArgs,
  SourceRootCliError,
} from './source-root'

export interface LibraryCompileCliOptions {
  sourceRoot?: string
  outputRoot?: string
  cacheRoot?: string
  cwd?: string
  envSourceRoot?: string
}

export async function runLibraryCompileCli(
  args: readonly string[] = process.argv.slice(2),
  options: LibraryCompileCliOptions = {},
): Promise<number> {
  try {
    const { positionalArgs, sourceRoot } = resolveLibrarySourceRootFromArgs(
      args,
      options,
    )
    if (positionalArgs.length > 0) {
      throw new SourceRootCliError(
        'Usage: npm run library:compile -- [--source-root <path>]',
      )
    }

    const result = await compileLibrary({
      sourceRoot,
      outputRoot: options.outputRoot,
      cacheRoot: options.cacheRoot,
    })

    for (const diagnostic of result.diagnostics) {
      const location = [
        diagnostic.songId,
        diagnostic.sourcePath,
        diagnostic.fieldPath,
      ]
        .filter(Boolean)
        .join(' ')

      console.log(
        `${diagnostic.severity.toUpperCase()} ${diagnostic.code}${
          location ? ` [${location}]` : ''
        }: ${diagnostic.message}`,
      )
    }

    if (result.valid) {
      console.log(
        `Library compile passed: ${result.songCount} edition(s), ${result.emittedFiles.length} runtime file(s).`,
      )
      return 0
    }

    console.log(
      `Library compile failed: ${result.errors} error(s), ${result.warnings} warning(s).`,
    )
    return 1
  } catch (error) {
    console.error(
      `Library compile failed: ${error instanceof Error ? error.message : String(error)}`,
    )
    return 1
  }
}

function isMainModule(): boolean {
  return Boolean(
    process.argv[1] &&
      path.resolve(process.argv[1]) === fileURLToPath(import.meta.url),
  )
}

if (isMainModule()) {
  process.exitCode = await runLibraryCompileCli()
}
