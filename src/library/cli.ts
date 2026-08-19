import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateLibrary } from './validator'
import {
  resolveLibrarySourceRootFromArgs,
  SourceRootCliError,
} from './source-root'

export interface LibraryValidateCliOptions {
  sourceRoot?: string
  cwd?: string
  envSourceRoot?: string
}

export function runLibraryValidateCli(
  args: readonly string[] = process.argv.slice(2),
  options: LibraryValidateCliOptions = {},
): number {
  try {
    const { positionalArgs, sourceRoot } = resolveLibrarySourceRootFromArgs(
      args,
      options,
    )
    if (positionalArgs.length > 0) {
      throw new SourceRootCliError(
        'Usage: npm run library:validate -- [--source-root <path>]',
      )
    }

    const result = validateLibrary(sourceRoot)

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
      const warningSummary =
        result.warnings > 0 ? `, ${result.warnings} warning(s)` : ''
      console.log(
        `Library validation passed: ${result.songCount} edition(s)${warningSummary}.`,
      )
      return 0
    }

    console.log(
      `Library validation failed: ${result.errors} error(s), ${result.warnings} warning(s).`,
    )
    return 1
  } catch (error) {
    console.error(
      `Library validation failed: ${error instanceof Error ? error.message : String(error)}`,
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
  process.exitCode = runLibraryValidateCli()
}
