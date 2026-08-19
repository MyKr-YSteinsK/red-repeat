import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  parseSourceRootArgs,
  resolveLibrarySourceRoot,
  resolveLibrarySourceRootFromArgs,
  SourceRootCliError,
} from './source-root'

describe('Library source root resolution', () => {
  const cwd = path.resolve('source-root-fixtures', 'repo')

  it('uses the explicit root before the environment root', () => {
    expect(
      resolveLibrarySourceRoot({
        cwd,
        explicitSourceRoot: 'flag-library',
        envSourceRoot: 'env-library',
      }),
    ).toBe(path.resolve(cwd, 'flag-library'))
  })

  it('uses the environment root before the default library directory', () => {
    expect(
      resolveLibrarySourceRoot({ cwd, envSourceRoot: 'env-library' }),
    ).toBe(path.resolve(cwd, 'env-library'))
  })

  it('resolves relative and absolute roots from the requested cwd', () => {
    const absoluteRoot = path.resolve(cwd, '..', 'private-library')

    expect(
      resolveLibrarySourceRoot({ cwd, explicitSourceRoot: 'relative-library' }),
    ).toBe(path.resolve(cwd, 'relative-library'))
    expect(
      resolveLibrarySourceRoot({ cwd, explicitSourceRoot: absoluteRoot }),
    ).toBe(absoluteRoot)
  })

  it('treats an empty environment root as unset', () => {
    expect(resolveLibrarySourceRoot({ cwd, envSourceRoot: '' })).toBe(
      path.resolve(cwd, 'library'),
    )
  })

  it('parses the source-root flag without disturbing positional arguments', () => {
    expect(
      resolveLibrarySourceRootFromArgs(
        ['senbonzakura', '--source-root', 'private-library'],
        { cwd, envSourceRoot: 'env-library' },
      ),
    ).toEqual({
      positionalArgs: ['senbonzakura'],
      explicitSourceRoot: 'private-library',
      sourceRoot: path.resolve(cwd, 'private-library'),
    })
  })

  it('reports a deterministic error when the source-root value is missing', () => {
    expect(() => parseSourceRootArgs(['--source-root'])).toThrow(
      new SourceRootCliError('--source-root requires a value'),
    )
    expect(() => parseSourceRootArgs(['--source-root', '--other'])).toThrow(
      '--source-root requires a value',
    )
  })
})
