import { useEffect, useState, useSyncExternalStore } from 'react'
import { RUNTIME_CONTRACT_VERSION, type Catalog } from '../library/runtime-schema'
import { describeUpdateStatus, type UpdateManager } from '../pwa/update-manager'
import { buildInfo } from '../release/build-info'
import { compareSemVer } from '../release/semver'
import { ReleaseEntry } from './ReleaseHistory'

export function SystemSettings({
  catalog,
  catalogLoading,
  updateManager,
}: {
  catalog?: Catalog
  catalogLoading: boolean
  updateManager: UpdateManager
}) {
  const snapshot = useSyncExternalStore(
    updateManager.subscribe,
    updateManager.getSnapshot,
    updateManager.getSnapshot,
  )
  const offlineStatus = useOfflineStatus()
  const remote = snapshot.remote
  const remoteHasUpdate = Boolean(remote && (
    compareSemVer(remote.version, buildInfo.version) > 0 ||
    (remote.version === buildInfo.version && remote.commit !== buildInfo.commit)
  ))
  const remoteRelease = remoteHasUpdate && remote?.release?.version === remote?.version
    ? remote?.release
    : undefined
  const missingCatalog = catalogLoading ? '读取中…' : '暂不可用'

  return (
    <section className="settings-card settings-system" aria-labelledby="system-info-title">
      <div className="settings-system-local">
        <h2 id="system-info-title">系统与更新</h2>
        <dl className="settings-installed-build">
          <div><dt>当前版本</dt><dd>{buildInfo.version}</dd></div>
          <div><dt>Build SHA</dt><dd>{buildInfo.commit}</dd></div>
        </dl>
        <details className="settings-disclosure">
          <summary>构建与曲库详情</summary>
          <dl className="settings-facts">
            <div><dt>发布环境</dt><dd>{buildInfo.environment}</dd></div>
            <div><dt>Runtime contract</dt><dd>v{RUNTIME_CONTRACT_VERSION}</dd></div>
            <div><dt>曲库歌曲</dt><dd>{catalog?.editions.length ?? missingCatalog}</dd></div>
            <div><dt>Catalog hash</dt><dd>{catalog?.contentHash.slice(0, 12) ?? missingCatalog}</dd></div>
            <div><dt>PWA / offline cache</dt><dd>{offlineStatus}</dd></div>
          </dl>
        </details>
      </div>

      <section className="settings-update-panel" aria-labelledby="app-update-title" data-status={snapshot.status}>
        <div className="settings-update-heading">
          <h3 id="app-update-title">应用更新</h3>
          <button
            className="control-button control-button--quiet"
            type="button"
            onClick={() => void updateManager.checkForUpdate({ manual: true })}
            disabled={snapshot.status === 'checking'}
          >
            {snapshot.status === 'checking' ? '检查中…' : snapshot.status === 'error' ? '重试检查' : '检查更新'}
          </button>
        </div>
        <p className="settings-update-status" role="status">
          {describeUpdateStatus(snapshot)}
        </p>
        {snapshot.status === 'error' && snapshot.error ? (
          <p className="settings-update-error">{snapshot.error}</p>
        ) : null}
        {snapshot.checkedAt !== undefined ? (
          <details className="settings-disclosure" data-update-build>
            <summary>{remote ? '线上构建与检查记录' : '检查记录'}</summary>
            {remote && snapshot.status === 'error' ? <p>下方线上信息来自上次成功检查。</p> : null}
            <dl className="settings-facts">
              {remote ? (
                <>
                  <div><dt>线上版本</dt><dd>{remote.version}</dd></div>
                  <div><dt>线上 Build SHA</dt><dd>{remote.commit}</dd></div>
                  <div><dt>线上构建时间</dt><dd>{remote.builtAt}</dd></div>
                </>
              ) : null}
              <div><dt>最近检查</dt><dd>{new Date(snapshot.checkedAt).toISOString()}</dd></div>
            </dl>
          </details>
        ) : null}
        {remoteHasUpdate ? (
          remoteRelease ? (
            <section className="settings-remote-release" data-remote-release aria-labelledby="remote-release-title">
              <h4 id="remote-release-title">远端更新说明</h4>
              <ReleaseEntry release={remoteRelease} />
            </section>
          ) : (
            <p className="settings-update-note" data-remote-release-unavailable>
              发现新版本，但暂时无法读取更新说明。
            </p>
          )
        ) : null}
      </section>
    </section>
  )
}

function useOfflineStatus(): string {
  const [status, setStatus] = useState(getOfflineStatus)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const update = () => setStatus(getOfflineStatus())
    navigator.serviceWorker.addEventListener('controllerchange', update)
    update()
    return () => navigator.serviceWorker.removeEventListener('controllerchange', update)
  }, [])

  return status
}

function getOfflineStatus(): string {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return '当前环境不可用'
  return navigator.serviceWorker.controller ? '可用' : '可用，等待接管'
}
