import { describe, expect, it } from 'vitest'
import {
  createEditionHref,
  createLibraryHref,
  createSettingsHref,
  createTimingDebuggerHref,
  parseAppRoute,
} from './navigation'

const location = {
  pathname: '/red-repeat/',
  search: '?view=archive',
  hash: '',
}

describe('static-safe navigation', () => {
  it('uses the current nested path for the Library home', () => {
    expect(createLibraryHref(location)).toBe('/red-repeat/?view=archive')
  })

  it('encodes an edition route without requiring a server rewrite', () => {
    const href = createEditionHref('first-light', location)

    expect(href).toBe('/red-repeat/?view=archive#edition=first-light')
    expect(parseAppRoute({ hash: '#edition=first-light' })).toEqual({
      kind: 'edition',
      songId: 'first-light',
    })
  })

  it('falls back to Library for an empty or unknown hash', () => {
    expect(parseAppRoute({ hash: '' })).toEqual({ kind: 'library' })
    expect(parseAppRoute({ hash: '#other=value' })).toEqual({ kind: 'library' })
  })

  it('recognizes the Timeline Debugger only in dev mode', () => {
    expect(
      parseAppRoute(
        { hash: '#debug=timeline&edition=first-light' },
        { devMode: true },
      ),
    ).toEqual({ kind: 'timeline-debugger', songId: 'first-light' })
    expect(
      parseAppRoute({ hash: '#debug=timeline' }, { devMode: true }),
    ).toEqual({ kind: 'timeline-debugger' })
    expect(
      parseAppRoute(
        { hash: '#debug=timeline&edition=first-light' },
        { devMode: false },
      ),
    ).toEqual({ kind: 'library' })
  })

  it('exposes the normal-product Timing Debugger route', () => {
    expect(createTimingDebuggerHref('first-light', location)).toBe(
      '/red-repeat/?view=archive#timing=debug&edition=first-light',
    )
    expect(parseAppRoute({ hash: '#timing=debug&edition=first-light' })).toEqual({
      kind: 'timing-debugger',
      songId: 'first-light',
    })
    expect(parseAppRoute({ hash: '#timing=debug' })).toEqual({
      kind: 'timing-debugger',
    })
  })

  it('exposes the Settings route under the current static-safe path', () => {
    expect(createSettingsHref(location)).toBe('/red-repeat/?view=archive#settings')
    expect(parseAppRoute({ hash: '#settings' })).toEqual({ kind: 'settings' })
    expect(createSettingsHref(location, '1.2.0')).toBe(
      '/red-repeat/?view=archive#settings&release=1.2.0',
    )
    expect(parseAppRoute({ hash: '#settings&release=1.2.0' })).toEqual({
      kind: 'settings',
      releaseVersion: '1.2.0',
    })
  })
})
