export interface ParsedSemVer {
  major: number
  minor: number
  patch: number
}

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

export function parseSemVer(value: string): ParsedSemVer | undefined {
  const match = SEMVER_PATTERN.exec(value)
  if (!match) {
    return undefined
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}

export function compareSemVer(left: string, right: string): number {
  const leftVersion = parseSemVer(left)
  const rightVersion = parseSemVer(right)
  if (!leftVersion || !rightVersion) {
    throw new Error(`Invalid SemVer comparison: ${left} vs ${right}`)
  }

  for (const key of ['major', 'minor', 'patch'] as const) {
    if (leftVersion[key] !== rightVersion[key]) {
      return leftVersion[key] > rightVersion[key] ? 1 : -1
    }
  }
  return 0
}

export function formatMilestoneLabel(version: string): string {
  const parsed = parseSemVer(version)
  if (!parsed) {
    throw new Error(`Invalid SemVer: ${version}`)
  }
  return `${parsed.major}.${parsed.minor}`
}
