import type { RemoteReleaseNote } from '../pwa/version-probe'
import { buildInfo } from '../release/build-info'
import { groupReleaseLedger } from '../release/release-grouping'
import { RELEASES, type ReleaseNote } from '../release/releases'

export function ReleaseHistory({ highlightVersion }: { highlightVersion?: string }) {
  const releaseGrouping = groupReleaseLedger(RELEASES)
  const highlightedMilestoneVersion = highlightVersion
    ? releaseGrouping.milestoneGroups.find((group) =>
      group.children.some((release) => release.version === highlightVersion),
    )?.milestoneVersion ?? releaseGrouping.milestoneGroups[0]?.milestoneVersion
    : undefined

  return (
    <section className="settings-changelog" aria-labelledby="changelog-title">
      <div className="settings-changelog-heading">
        <div className="settings-card-heading">
          <p className="eyebrow">历史</p>
          <h2 id="changelog-title">更新日志</h2>
        </div>
        <p className="settings-current-version">
          当前版本 <strong>{buildInfo.version}</strong>
        </p>
      </div>
      {releaseGrouping.pendingVersions.length > 0 ? (
        <section className="settings-pending-releases" aria-labelledby="pending-releases-title">
          <div className="settings-release-section-heading">
            <p className="eyebrow">尚未进入下一个里程碑</p>
            <h3 id="pending-releases-title">开发中的小版本</h3>
          </div>
          <div className="settings-release-entry-list">
            {releaseGrouping.pendingVersions.map((release) => (
              <ReleaseEntry key={release.version} release={release} />
            ))}
          </div>
        </section>
      ) : null}
      <div className="settings-release-list">
        {releaseGrouping.milestoneGroups.map((group) => {
          const milestone = group.children.find(
            (release) => release.version === group.milestoneVersion,
          )
          if (!milestone) {
            return null
          }

          return (
            <details
              key={group.milestoneVersion}
              data-release-milestone
              data-release-highlighted={group.milestoneVersion === highlightedMilestoneVersion ? 'true' : undefined}
              className={group.milestoneVersion === highlightedMilestoneVersion ? 'settings-release-highlight' : undefined}
              open={group.milestoneVersion === highlightedMilestoneVersion}
            >
              <summary>
                <span>{group.label}</span>
                <span>{milestone.date}</span>
                <strong>{milestone.title}</strong>
              </summary>
              <div className="settings-release-entry-list">
                {group.children.map((release) => (
                  <ReleaseEntry key={release.version} release={release} />
                ))}
              </div>
            </details>
          )
        })}
      </div>
    </section>
  )
}

export function ReleaseEntry({ release }: { release: ReleaseNote | RemoteReleaseNote }) {
  return (
    <article className="settings-release-entry" data-release-entry>
      <header>
        <div>
          <h3>{release.version}</h3>
          <p>{release.date}</p>
        </div>
        <strong>{release.title}</strong>
      </header>
      <p>{release.summary}</p>
      <ul>
        {release.changes.map((change) => <li key={change}>{change}</li>)}
      </ul>
    </article>
  )
}
