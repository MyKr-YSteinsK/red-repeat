import { describe, expect, it } from 'vitest'
import {
  createEditionHref,
  createLibraryHref,
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
})
