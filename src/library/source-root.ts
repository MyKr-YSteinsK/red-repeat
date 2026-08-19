import path from 'node:path'

export const LIBRARY_SOURCE_ROOT_ENV = 'RED_REPEAT_LIBRARY_ROOT'
export const DEFAULT_LIBRARY_SOURCE_DIRECTORY = 'library'

export interface ResolveLibrarySourceRootOptions {
  cwd?: string
  explicitSourceRoot?: string
  envSourceRoot?: string
}

export interface ParseSourceRootArgsResult {
  positionalArgs: string[]
  explicitSourceRoot?: string
}

export interface ResolveLibrarySourceRootFromArgsOptions {
  cwd?: string
  sourceRoot?: string
  envSourceRoot?: string
}

export class SourceRootCliError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SourceRootCliError'
  }
}

export function resolveLibrarySourceRoot(
  options: ResolveLibrarySourceRootOptions = {},
): string {
  const cwd = path.resolve(options.cwd ?? process.cwd())
  const envSourceRoot =
    options.envSourceRoot === undefined
      ? process.env[LIBRARY_SOURCE_ROOT_ENV]
      : options.envSourceRoot
  const sourceRoot = firstNonEmpty(
    options.explicitSourceRoot,
    envSourceRoot,
  )

  return path.resolve(cwd, sourceRoot ?? DEFAULT_LIBRARY_SOURCE_DIRECTORY)
}

export function parseSourceRootArgs(
  args: readonly string[],
): ParseSourceRootArgsResult {
  const positionalArgs: string[] = []
  let explicitSourceRoot: string | undefined

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg !== '--source-root') {
      positionalArgs.push(arg)
      continue
    }

    if (explicitSourceRoot !== undefined) {
      throw new SourceRootCliError('duplicate --source-root flag')
    }

    const value = args[index + 1]
    if (!value || value.startsWith('--')) {
      throw new SourceRootCliError('--source-root requires a value')
    }

    explicitSourceRoot = value
    index += 1
  }

  return { positionalArgs, explicitSourceRoot }
}

export function resolveLibrarySourceRootFromArgs(
  args: readonly string[],
  options: ResolveLibrarySourceRootFromArgsOptions = {},
): ParseSourceRootArgsResult & { sourceRoot: string } {
  const parsed = parseSourceRootArgs(args)
  return {
    ...parsed,
    sourceRoot: resolveLibrarySourceRoot({
      cwd: options.cwd,
      explicitSourceRoot: parsed.explicitSourceRoot ?? options.sourceRoot,
      envSourceRoot: options.envSourceRoot,
    }),
  }
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value !== undefined && value.trim().length > 0)
}
