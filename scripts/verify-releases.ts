import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { RELEASES, type ReleaseLevel } from '../src/release/releases'
import { compareSemVer, parseSemVer } from '../src/release/semver'

interface PackageManifest {
  version?: unknown
}

const requireTags = process.argv.includes('--require-tags')
const failures: string[] = []
const packageManifest = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as PackageManifest
const seenVersions = new Set<string>()
const seenTags = new Set<string>()

for (let index = 0; index < RELEASES.length; index += 1) {
  const release = RELEASES[index]
  const parsed = parseSemVer(release.version)

  if (!parsed) {
    failures.push(`${release.version}: invalid SemVer`)
    continue
  }
  if (seenVersions.has(release.version)) {
    failures.push(`${release.version}: duplicate version`)
  }
  seenVersions.add(release.version)

  if (index > 0 && compareSemVer(RELEASES[index - 1].version, release.version) <= 0) {
    failures.push(`${release.version}: ledger is not newest-first`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(release.date)) {
    failures.push(`${release.version}: invalid release date ${release.date}`)
  }
  if (!/^[0-9a-f]{7,40}$/.test(release.commit)) {
    failures.push(`${release.version}: invalid commit ${release.commit}`)
  }
  if (release.changes.length === 0) {
    failures.push(`${release.version}: changes must not be empty`)
  }
  validateLevel(release.version, parsed.patch, release.level, failures)

  const commit = resolveCommit(release.commit)
  if (!commit) {
    failures.push(`${release.version}: commit ${release.commit} is not available`)
    continue
  }
  const commitDate = git('show', '-s', '--format=%cs', commit)
  if (commitDate !== release.date) {
    failures.push(
      `${release.version}: date ${release.date} does not match ${commit} (${commitDate})`,
    )
  }

  if (requireTags) {
    const tag = `v${release.version}`
    seenTags.add(tag)
    const tagCommit = resolveCommit(tag)
    if (!tagCommit) {
      failures.push(`${release.version}: missing tag ${tag}`)
    } else if (tagCommit !== commit) {
      failures.push(`${tag}: points to ${tagCommit}, expected ${commit}`)
    }
  }
}

if (packageManifest.version !== RELEASES[0]?.version) {
  failures.push(
    `package.json version ${String(packageManifest.version)} does not match ${RELEASES[0]?.version}`,
  )
}

if (requireTags) {
  for (const tag of git('tag', '--list', 'v*').split('\n').filter(Boolean)) {
    if (!seenTags.has(tag)) {
      failures.push(`${tag}: tag is not represented in the release ledger`)
    }
  }
}

if (failures.length > 0) {
  console.error('Release verification failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exitCode = 1
} else {
  console.log(
    `Release verification passed: ${RELEASES.length} entries, latest ${RELEASES[0]?.version}${requireTags ? ', tags verified' : ''}.`,
  )
}

function validateLevel(
  version: string,
  patch: number,
  level: ReleaseLevel,
  errors: string[],
): void {
  if (patch > 0 && level !== 'patch') {
    errors.push(`${version}: non-zero patch must use level patch`)
  }
  if (patch === 0 && level === 'patch') {
    errors.push(`${version}: milestone must use level minor or major`)
  }
  if (version.startsWith('1.0.') && level !== 'major') {
    errors.push(`${version}: 1.0.0 must use level major`)
  }
}

function resolveCommit(ref: string): string | undefined {
  try {
    return git('rev-parse', '--verify', `${ref}^{commit}`)
  } catch {
    return undefined
  }
}

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}
