import { describe, expect, it } from 'vitest'
import { RELEASES } from './releases'
import { compareSemVer, parseSemVer } from './semver'

describe('release ledger', () => {
  it('keeps a unique, newest-first SemVer history with complete entries', () => {
    const versions = RELEASES.map((release) => release.version)

    expect(new Set(versions).size).toBe(versions.length)
    expect(RELEASES.every((release) => parseSemVer(release.version))).toBe(true)
    expect(RELEASES.every((release) => /^[0-9a-f]{7,40}$/.test(release.commit))).toBe(true)
    expect(RELEASES.every((release) => release.changes.length > 0)).toBe(true)

    for (let index = 1; index < versions.length; index += 1) {
      expect(compareSemVer(versions[index - 1], versions[index])).toBeGreaterThan(0)
    }
  })
})
