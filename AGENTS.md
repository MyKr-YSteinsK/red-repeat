# RED:REPEAT 项目入口

RED:REPEAT 是以 Song Edition 为单位学唱、听歌和读讲解的个人 PWA。当前维护入口为
[项目源文件](docs/项目源文件/00-START_HERE.md)。新对话先读
[项目合同](docs/项目源文件/PROJECT.md)和[当前状态](docs/项目源文件/STATUS.md)，
按任务读取[运行手册](docs/项目源文件/RUNBOOK.md)及[工程与交付约定](docs/项目源文件/GOVERNANCE.md)。
[升级审查与路线](docs/项目源文件/升级审查与路线.md)供用户评审，实施须另有授权。

- 以当前仓库、可执行配置和任务正文核对事实与授权。正式交接沿用 `RED-Plan-<n>` 编号，
  优先读目标仓库 GitHub Issue 的完整正文。歌曲 Handoff 中已批准的内容与资源按原稿验收和集成。
- `library/<song-id>/` 是获批公开源。保护 `.private/`、用户已有改动及本机资料。
  `public/library-runtime/`、`dist/`、`.cache/` 为生成物，`docs/delete/` 为本地待清理区。
- 同一 Occurrence 的有效 `startMs/endMs` 同时控制解析、高亮和范围播放。保护单一音频生命周期、
  本地状态的身份校验、完整离线快照和 PWA 的自然下次启动接管。调整这些行为前先确认授权及相应验收。
- 使用匹配变更的验证。静态构建、真浏览器、iOS/installed-PWA 与听感分别核验。
  `npm run build` 已包含 Library 编译与 TypeScript 构建。
- 推送前核对目标分支和实际权限。`main` 的成功 CI 会进入 Pages 部署。版本、tag 和发布按独立授权处理，
  禁止强推或覆盖发布 tag。报告与回执默认用中文，标识符保留原样。
