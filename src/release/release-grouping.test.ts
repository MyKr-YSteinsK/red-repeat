import { describe, expect, it } from 'vitest'
import type { ReleaseLevel, ReleaseNote } from './releases'
import { groupReleaseEntries } from './release-grouping'

describe('release milestone grouping', () => {
  it('keeps patches after the latest milestone pending', () => {
    const result = groupReleaseEntries([
      release('0.1.0', 'minor'),
      release('0.1.1', 'patch'),
    ])

    expect(versions(result.pendingVersions)).toEqual(['0.1.1'])
    expect(result.milestoneGroups.map((group) => [group.label, versions(group.children)])).toEqual([
      ['0.1', ['0.1.0']],
    ])
  })

  it('archives pending patches into the next minor milestone', () => {
    const result = groupReleaseEntries([
      release('0.1.0', 'minor'),
      release('0.1.1', 'patch'),
      release('0.1.2', 'patch'),
      release('0.2.0', 'minor'),
    ])

    expect(versions(result.pendingVersions)).toEqual([])
    expect(result.milestoneGroups.map((group) => [group.label, versions(group.children)])).toEqual([
      ['0.2', ['0.1.1', '0.1.2', '0.2.0']],
      ['0.1', ['0.1.0']],
    ])
  })

  it('archives pending patches across a major jump and leaves later patches pending', () => {
    const result = groupReleaseEntries([
      release('0.9.0', 'minor'),
      release('0.9.1', 'patch'),
      release('0.9.2', 'patch'),
      release('1.0.0', 'major'),
      release('1.0.1', 'patch'),
    ])

    expect(versions(result.pendingVersions)).toEqual(['1.0.1'])
    expect(result.milestoneGroups.map((group) => [group.label, versions(group.children)])).toEqual([
      ['1.0', ['0.9.1', '0.9.2', '1.0.0']],
      ['0.9', ['0.9.0']],
    ])
  })

  it('keeps consecutive minor milestones as separate non-empty groups', () => {
    const result = groupReleaseEntries([
      release('0.4.0', 'minor'),
      release('0.5.0', 'minor'),
      release('0.6.0', 'minor'),
    ])

    expect(result.pendingVersions).toHaveLength(0)
    expect(result.milestoneGroups.map((group) => [group.label, versions(group.children)])).toEqual([
      ['0.6', ['0.6.0']],
      ['0.5', ['0.5.0']],
      ['0.4', ['0.4.0']],
    ])
  })
})

function release(version: string, level: ReleaseLevel): ReleaseNote {
  return {
    version,
    date: '2026-08-23',
    commit: 'a'.repeat(7),
    level,
    title: version,
    summary: version,
    changes: [version],
  }
}

function versions(releases: readonly ReleaseNote[]): string[] {
  return releases.map((release) => release.version)
}
