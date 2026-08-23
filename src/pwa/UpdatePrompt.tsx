import type { UpdateSnapshot } from './update-manager'
import { buildInfo } from '../release/build-info'

export interface UpdatePromptProps {
  snapshot: UpdateSnapshot
  settingsHref: string
  onApplyUpdate: () => void
  onDismiss: () => void
}

export function UpdatePrompt({
  snapshot,
  settingsHref,
  onApplyUpdate,
  onDismiss,
}: UpdatePromptProps) {
  const isUpdating = snapshot.status === 'updating'
  if (
    snapshot.dismissed ||
    (snapshot.status !== 'update-available' && !isUpdating)
  ) {
    return null
  }

  return (
    <aside
      className="update-prompt"
      aria-label="应用更新提示"
      aria-live="polite"
      aria-busy={isUpdating}
    >
      <div className="update-prompt-copy">
        <p className="eyebrow">PWA / 更新</p>
        <h2>
          {isUpdating
            ? '正在更新…'
            : snapshot.remote?.version
              ? snapshot.remote.version === buildInfo.version
                ? `发现新的构建 ${snapshot.remote.version}`
                : `发现新版本 ${snapshot.remote.version}`
              : '发现新版本'}
        </h2>
        <p>
          {isUpdating
            ? '正在激活新的 Service Worker，页面即将刷新。'
            : '新构建已经准备好，可以在不重新安装 App 的情况下更新。'}
        </p>
      </div>
      <div className="update-prompt-actions">
        <a className="update-prompt-link" href={settingsHref}>查看更新</a>
        <button
          type="button"
          className="update-prompt-primary"
          onClick={onApplyUpdate}
          disabled={isUpdating}
        >
          {isUpdating ? '更新中…' : '立即更新'}
        </button>
        <button
          type="button"
          className="update-prompt-dismiss"
          onClick={onDismiss}
          disabled={isUpdating}
        >
          稍后
        </button>
      </div>
    </aside>
  )
}
