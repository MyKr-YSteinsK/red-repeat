import { formatMilestoneLabel, parseSemVer } from './semver'
import type { ReleaseNote } from './releases'

export interface ReleaseMilestoneGroup {
  label: string
  milestoneVersion: string
  children: readonly ReleaseNote[]
}

export interface ReleaseGrouping {
  pendingVersions: readonly ReleaseNote[]
  milestoneGroups: readonly ReleaseMilestoneGroup[]
}

/**
 * Groups a chronological (oldest-first) release history into milestone windows.
 * A milestone closes the window before it; patches after the newest milestone
 * remain pending until a later minor or major milestone exists.
 */
export function groupReleaseEntries(
  chronologicalEntries: readonly ReleaseNote[],
): ReleaseGrouping {
  const milestoneIndexes = chronologicalEntries.flatMap((release, index) => {
    const parsed = parseSemVer(release.version)
    return parsed && parsed.patch === 0 && release.level !== 'patch' ? [index] : []
  })

  if (milestoneIndexes.length === 0) {
    return {
      pendingVersions: [...chronologicalEntries].reverse(),
      milestoneGroups: [],
    }
  }

  const milestoneGroups = milestoneIndexes.map((milestoneIndex, groupIndex) => {
    const previousMilestoneIndex = milestoneIndexes[groupIndex - 1]
    const startIndex = previousMilestoneIndex === undefined
      ? milestoneIndex
      : previousMilestoneIndex + 1
    const milestone = chronologicalEntries[milestoneIndex]

    return {
      label: formatMilestoneLabel(milestone.version),
      milestoneVersion: milestone.version,
      children: chronologicalEntries.slice(startIndex, milestoneIndex + 1),
    }
  })

  const lastMilestoneIndex = milestoneIndexes[milestoneIndexes.length - 1]
  return {
    pendingVersions: chronologicalEntries.slice(lastMilestoneIndex + 1).reverse(),
    milestoneGroups: milestoneGroups.reverse(),
  }
}

/** Adapts the newest-first order used by the release ledger to the pure grouper. */
export function groupReleaseLedger(
  newestFirstEntries: readonly ReleaseNote[],
): ReleaseGrouping {
  return groupReleaseEntries([...newestFirstEntries].reverse())
}
