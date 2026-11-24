import { useEffect, useRef } from 'react'
import type {
  PersonalBackupDocument,
  PersonalBackupDomain,
  PersonalBackupImportPreview,
} from '../practice/personal-backup'

export interface BackupImportUiState {
  document: PersonalBackupDocument
  fileName: string
  preview: PersonalBackupImportPreview
  selectedDomains: PersonalBackupDomain[]
  overwriteDomains: PersonalBackupDomain[]
}

interface PersonalBackupPanelProps {
  ready: boolean
  busy: boolean
  message?: string
  backup?: BackupImportUiState
  onExport: () => void
  onFile: (file: File | undefined) => void
  onSelectDomain: (domain: PersonalBackupDomain, checked: boolean) => void
  onOverwriteDomain: (domain: PersonalBackupDomain, checked: boolean) => void
  onConfirm: () => void
  onCancel: () => void
}

const domainLabels: Record<PersonalBackupDomain, string> = {
  practice: '学唱进度',
  rates: '播放速度',
  lyricDisplayPreferences: '歌词显示偏好',
  resumeContext: '最近学习位置',
  practiceQueue: '待练队列',
  timingOverrides: 'Timing Debugger 微调',
}

export function PersonalBackupPanel({
  ready, busy, message, backup, onExport, onFile,
  onSelectDomain, onOverwriteDomain, onConfirm, onCancel,
}: PersonalBackupPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const previewHeading = useRef<HTMLHeadingElement>(null)
  const feedback = useRef<HTMLParagraphElement>(null)
  const confirmationRequested = useRef(false)
  const preview = backup?.preview

  useEffect(() => {
    if (preview) previewHeading.current?.focus()
  }, [preview])

  useEffect(() => {
    if (confirmationRequested.current) {
      confirmationRequested.current = false
      feedback.current?.focus()
    }
  }, [message])

  return (
    <section className="settings-card settings-personal-backup" aria-labelledby="personal-backup-title">
      <h2 id="personal-backup-title">个人状态备份</h2>
      <p>导出和恢复当前兼容的学唱进度、播放速度、歌词显示、最近位置、待练队列和微调。</p>
      <details className="settings-disclosure">
        <summary>文件范围和导入规则</summary>
        <p>历史 Timing 保留记录不包含在此备份中，请单独导出。文件只由浏览器读取或下载，不含音频、歌曲 Runtime、离线下载记录、cookie 或未知本机数据。</p>
        <p>预览无写入。多键写入失败时逐键尝试补偿回滚和核验。浏览器 localStorage 不提供跨键断电原子事务。</p>
      </details>
      <div className="personal-backup-actions">
        <button
          className="control-button control-button--quiet"
          type="button"
          disabled={busy || !ready}
          onClick={onExport}
        >
          {busy ? '处理中…' : '导出个人备份 JSON'}
        </button>
        <label className="personal-backup-file">
          <span>选择本机 JSON 备份</span>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            disabled={busy || !ready}
            onChange={(event) => {
              confirmationRequested.current = false
              onFile(event.currentTarget.files?.[0])
              event.currentTarget.value = ''
            }}
          />
        </label>
      </div>
      {!ready ? <p className="settings-muted">曲库就绪后可核验备份身份。</p> : null}
      {message && !backup ? (
        <p className="personal-backup-message" ref={feedback} role="status" tabIndex={-1}>{message}</p>
      ) : null}
      {backup ? (
        <div className="personal-backup-preview" aria-labelledby="backup-preview-title">
          <div className="personal-backup-preview-heading">
            <h3 id="backup-preview-title" ref={previewHeading} tabIndex={-1}>导入预览</h3>
            <strong>{backup.fileName}</strong>
            <p>生成时间 <time dateTime={backup.document.createdAt}>{backup.document.createdAt}</time></p>
          </div>
          <BackupDomains
            backup={backup}
            onSelectDomain={onSelectDomain}
            onOverwriteDomain={onOverwriteDomain}
          />
          <div className="personal-backup-confirm">
            <BackupWriteSummary backup={backup} />
            {message ? (
              <p className="personal-backup-message" ref={feedback} role="status" tabIndex={-1}>{message}</p>
            ) : null}
            <div className="personal-backup-confirm-actions">
              <button
                className="control-button control-button--quiet"
                type="button"
                onClick={() => {
                  confirmationRequested.current = false
                  onCancel()
                  fileInput.current?.focus()
                }}
              >
                取消导入
              </button>
              <button
                className="control-button control-button--primary"
                type="button"
                disabled={busy || backup.selectedDomains.length === 0}
                onClick={() => {
                  confirmationRequested.current = true
                  onConfirm()
                }}
              >
                确认导入所选数据域
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function BackupDomains({
  backup,
  onSelectDomain,
  onOverwriteDomain,
}: Pick<PersonalBackupPanelProps, 'onSelectDomain' | 'onOverwriteDomain'> & {
  backup: BackupImportUiState
}) {
  const { candidates, skipped } = backup.preview
  const domains = new Set<PersonalBackupDomain>([
    ...candidates.map(({ domain }) => domain),
    ...(Object.keys(skipped) as PersonalBackupDomain[]),
  ])
  if (domains.size === 0) return <p>备份中没有可恢复的白名单数据。</p>

  return (
    <fieldset className="personal-backup-domains">
      <legend>选择要恢复的数据域</legend>
      <p>默认保留本机的已有值。需要替换时，为对应数据域单独选择覆盖。</p>
      <ul>
        {[...domains].map((domain) => {
          const selected = backup.selectedDomains.includes(domain)
          const entries = candidates.filter((entry) => entry.domain === domain)
          const added = entries.filter(({ state }) => state === 'new').length
          const conflicts = entries.filter(({ state }) => state === 'conflict').length
          const unchanged = entries.filter(({ state }) => state === 'unchanged').length
          return (
            <li key={domain} className="personal-backup-domain" data-selected={selected}>
              <label>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => onSelectDomain(domain, event.currentTarget.checked)}
                />
                <span>
                  <strong>{domainLabels[domain]}</strong>
                  <small>新增 {added} · 已有冲突 {conflicts} · 相同 {unchanged} · 跳过 {skipped[domain] ?? 0}</small>
                </span>
              </label>
              {conflicts > 0 ? (
                <label className="personal-backup-overwrite">
                  <input
                    type="checkbox"
                    checked={backup.overwriteDomains.includes(domain)}
                    disabled={!selected}
                    onChange={(event) => onOverwriteDomain(domain, event.currentTarget.checked)}
                  />
                  <span>明确覆盖该域中身份相同的已有值</span>
                </label>
              ) : null}
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

function BackupWriteSummary({ backup }: { backup: BackupImportUiState }) {
  const selected = backup.preview.candidates.filter(({ domain }) => backup.selectedDomains.includes(domain))
  const additions = selected.filter(({ state }) => state === 'new').length
  const conflicts = selected.filter(({ state }) => state === 'conflict')
  const overwrites = conflicts.filter(({ domain }) => backup.overwriteDomains.includes(domain)).length

  return (
    <p className="personal-backup-write-summary" aria-live="polite" data-overwrite={overwrites > 0}>
      {backup.selectedDomains.length > 0
        ? `确认后会新增 ${additions} 项、覆盖 ${overwrites} 项，保留所选域中 ${conflicts.length - overwrites} 项冲突的本机值。`
        : '选择数据域后可确认导入。未选中的数据域保留本机原值。'}
    </p>
  )
}
